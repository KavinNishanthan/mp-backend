import { Request, Response } from 'express';
import Bill from '../models/Bill';
import Shop from '../models/Shop';
import Payment from '../models/Payment';
import Stock from '../models/Stock';
import StockMovement from '../models/StockMovement';
import Vehicle from '../models/Vehicle';

// @desc    Get Admin Dashboard Stats (Cards)
// @route   GET /api/dashboard/stats
// @access  Private/Admin
export const getAdminDashboardStats = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        // Outstanding is always all-time
        const shops = await Shop.find({ isActive: true });
        const totalOutstanding = shops.reduce((acc, shop) => acc + Math.max(0, shop.outstandingBalance), 0);

        // Use date range or default to today
        let dateStart: Date, dateEnd: Date;
        if (startDate && endDate) {
            dateStart = new Date(startDate as string);
            dateEnd = new Date(endDate as string);
        } else {
            dateStart = new Date();
            dateStart.setHours(0, 0, 0, 0);
            dateEnd = new Date();
            dateEnd.setHours(23, 59, 59, 999);
        }

        const bills = await Bill.find({
            date: { $gte: dateStart, $lte: dateEnd },
            isDeleted: { $ne: true },
        }).select('+items.costPriceSnapshot');

        const totalSales = bills.reduce((acc, bill) => acc + bill.totalAmount, 0);
        const totalCollections = bills.reduce((acc, bill) => acc + bill.paidAmount, 0);

        // Also count standalone payments in the date range
        const payments = await Payment.find({
            date: { $gte: dateStart, $lte: dateEnd },
        });
        const paymentCollections = payments.reduce((acc, p) => acc + p.amount, 0);

        let totalProfit = 0;
        bills.forEach(bill => {
            bill.items.forEach(item => {
                totalProfit += (item.sellingPrice - item.costPriceSnapshot) * item.quantity;
            });
        });

        res.json({
            totalOutstanding,
            totalSales,
            totalCollections: totalCollections + paymentCollections,
            totalProfit,
            billCount: bills.length,
            paymentCount: payments.length,
        });
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Comprehensive Financial Report
// @route   GET /api/dashboard/reports
// @access  Private/Admin
export const getFinancialReport = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    try {
        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        const billQuery: any = { isDeleted: { $ne: true } };
        if (dateFilter.$gte) billQuery.date = dateFilter;

        const bills = await Bill.find(billQuery)
            .populate('shopId', 'name')
            .populate('items.productId', 'name unit')
            .select('+items.costPriceSnapshot')
            .lean();

        const paymentQuery: any = {};
        if (dateFilter.$gte) paymentQuery.date = dateFilter;

        const payments = await Payment.find(paymentQuery)
            .populate('shopId', 'name')
            .lean();

        // --- Sales & Profit calculations ---
        let totalSales = 0;
        let totalProfit = 0;
        let totalBillCollections = 0;
        const profitByProduct: Record<string, { name: string; unit: string; profit: number; sales: number; qty: number }> = {};
        const profitByShop: Record<string, { name: string; profit: number; sales: number; collections: number; outstanding: number }> = {};

        bills.forEach(bill => {
            let billProfit = 0;
            totalSales += bill.totalAmount;
            totalBillCollections += bill.paidAmount;

            bill.items.forEach((item: any) => {
                const itemProfit = (item.sellingPrice - item.costPriceSnapshot) * item.quantity;
                billProfit += itemProfit;

                const pid = item.productId?._id?.toString() || item.productId?.toString();
                const pname = item.productId?.name || 'Unknown';
                const punit = item.productId?.unit || '';
                if (!profitByProduct[pid]) {
                    profitByProduct[pid] = { name: pname, unit: punit, profit: 0, sales: 0, qty: 0 };
                }
                profitByProduct[pid].profit += itemProfit;
                profitByProduct[pid].sales += item.total;
                profitByProduct[pid].qty += item.quantity;
            });

            totalProfit += billProfit;

            const shopId = (bill.shopId as any)?._id?.toString();
            const shopName = (bill.shopId as any)?.name || 'Unknown';
            if (shopId) {
                if (!profitByShop[shopId]) {
                    profitByShop[shopId] = { name: shopName, profit: 0, sales: 0, collections: 0, outstanding: 0 };
                }
                profitByShop[shopId].profit += billProfit;
                profitByShop[shopId].sales += bill.totalAmount;
                profitByShop[shopId].collections += bill.paidAmount;
            }
        });

        // Add standalone payment collections to shop data
        let totalPaymentCollections = 0;
        payments.forEach(p => {
            totalPaymentCollections += p.amount;
            const sid = (p.shopId as any)?._id?.toString();
            if (sid && profitByShop[sid]) {
                profitByShop[sid].collections += p.amount;
            }
        });

        // Add current outstanding to each shop
        const allShops = await Shop.find({ isActive: true }).select('name outstandingBalance').lean();
        allShops.forEach(shop => {
            const sid = shop._id.toString();
            if (profitByShop[sid]) {
                profitByShop[sid].outstanding = Math.max(0, shop.outstandingBalance);
            }
        });

        // Outstanding report
        const totalOutstanding = allShops.reduce((acc, s) => acc + Math.max(0, s.outstandingBalance), 0);
        const outstandingByShop = allShops
            .filter(s => s.outstandingBalance > 0)
            .map(s => ({ name: s.name, outstanding: s.outstandingBalance }))
            .sort((a, b) => b.outstanding - a.outstanding);

        res.json({
            totalSales,
            totalCollections: totalBillCollections + totalPaymentCollections,
            totalProfit,
            totalOutstanding,
            billCount: bills.length,
            profitByProduct: Object.values(profitByProduct).sort((a, b) => b.profit - a.profit),
            profitByShop: Object.values(profitByShop).sort((a, b) => b.sales - a.sales),
            outstandingByShop,
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Profit Report (Date Range) - legacy endpoint
// @route   GET /api/dashboard/profit
// @access  Private/Admin
export const getProfitReport = async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    try {
        let query: any = { isDeleted: { $ne: true } };
        if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string)
            };
        }

        const bills = await Bill.find(query)
            .populate('shopId', 'name')
            .select('+items.costPriceSnapshot');

        let totalProfit = 0;
        let totalSales = 0;
        const profitByShop: Record<string, { name: string, profit: number, sales: number }> = {};

        bills.forEach(bill => {
            let billProfit = 0;
            bill.items.forEach(item => {
                billProfit += (item.sellingPrice - item.costPriceSnapshot) * item.quantity;
            });

            totalProfit += billProfit;
            totalSales += bill.totalAmount;

            const shopId = (bill.shopId as any)._id.toString();
            const shopName = (bill.shopId as any).name;

            if (!profitByShop[shopId]) {
                profitByShop[shopId] = { name: shopName, profit: 0, sales: 0 };
            }
            profitByShop[shopId].profit += billProfit;
            profitByShop[shopId].sales += bill.totalAmount;
        });

        res.json({
            totalProfit,
            totalSales,
            profitByShop: Object.values(profitByShop),
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get Vehicle History (Daily Movement Tracking)
// @route   GET /api/dashboard/vehicle-history/:vehicleId
// @access  Private/Admin
export const getVehicleHistory = async (req: Request, res: Response) => {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    try {
        const vehicle = await Vehicle.findById(vehicleId).populate('driverId', 'name');
        if (!vehicle) {
            res.status(404).json({ message: 'Vehicle not found' });
            return;
        }

        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        // 1. Stock Movements (loads, transfers, returns)
        const movementQuery: any = {
            $or: [
                { destinationVehicleId: vehicleId },
                { sourceVehicleId: vehicleId },
            ]
        };
        if (dateFilter.$gte) movementQuery.date = dateFilter;

        const movements = await StockMovement.find(movementQuery)
            .populate('items.productId', 'name unit')
            .populate('performedBy', 'name')
            .sort({ date: 1 })
            .lean();

        // 2. Bills from this vehicle
        const billQuery: any = { vehicleId, isDeleted: { $ne: true } };
        if (dateFilter.$gte) billQuery.date = dateFilter;

        const bills = await Bill.find(billQuery)
            .populate('shopId', 'name')
            .populate('driverId', 'name')
            .populate('items.productId', 'name unit')
            .sort({ date: 1 })
            .lean();

        // Build timeline
        const timeline: any[] = [];

        // Categorize movements
        movements.forEach(m => {
            let category = 'TRANSFER';
            if (m.type === 'WAREHOUSE_TO_VEHICLE' || m.type === 'FACTORY_TO_WAREHOUSE') {
                category = 'LOADING';
            } else if (m.type === 'VEHICLE_TO_WAREHOUSE') {
                category = 'RETURN';
            } else if (m.type === 'VEHICLE_TO_VEHICLE') {
                category = m.sourceVehicleId?.toString() === vehicleId ? 'TRANSFER_OUT' : 'TRANSFER_IN';
            }

            timeline.push({
                type: category,
                date: m.date,
                movementType: m.type,
                items: m.items,
                performedBy: m.performedBy,
                description: m.description,
                _id: m._id,
            });
        });

        // Add deliveries (bills)
        bills.forEach(b => {
            timeline.push({
                type: 'DELIVERY',
                date: b.date,
                shop: b.shopId,
                driver: b.driverId,
                items: b.items,
                totalAmount: b.totalAmount,
                billId: b._id,
            });
        });

        // Sort chronologically
        timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate summaries
        let totalLoaded = 0;
        let totalDelivered = 0;
        let totalReturned = 0;

        timeline.forEach(event => {
            const qty = event.items?.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0) || 0;
            if (event.type === 'LOADING') totalLoaded += qty;
            else if (event.type === 'DELIVERY') totalDelivered += qty;
            else if (event.type === 'RETURN') totalReturned += qty;
        });

        // Get current stock
        const currentStock = await Stock.findOne({ location: 'vehicle', vehicleId })
            .populate('items.productId', 'name unit')
            .lean();

        res.json({
            vehicle: {
                _id: vehicle._id,
                registrationNumber: vehicle.registrationNumber,
                driver: vehicle.driverId,
            },
            summary: {
                totalLoaded,
                totalDelivered,
                totalReturned,
                closingStock: currentStock?.items?.reduce((acc, i) => acc + i.quantity, 0) || 0,
            },
            currentStock: currentStock?.items || [],
            timeline,
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
