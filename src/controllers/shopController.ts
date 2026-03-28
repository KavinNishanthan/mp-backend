import { Request, Response } from 'express';
import Shop from '../models/Shop';
import Bill from '../models/Bill';
import Payment from '../models/Payment';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Get All Shops
// @route   GET /api/shops
// @access  Private
export const getShops = async (req: Request, res: Response) => {
    const shops = await Shop.find({ isActive: true }).sort({ name: 1 });
    res.json(shops);
};

// @desc    Get Shop by ID
// @route   GET /api/shops/:id
// @access  Private
export const getShopById = async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404).json({ message: 'Shop not found' });
        return;
    }
    res.json(shop);
};

// @desc    Create Shop
// @route   POST /api/shops
// @access  Private/Admin
export const createShop = async (req: Request, res: Response) => {
    const { name, address, contactNumber, customPrices } = req.body;
    console.log(name, address, contactNumber, customPrices);
    const shop = await Shop.create({ name, address, contactNumber, customPrices });
    res.status(201).json(shop);
};

// @desc    Update Shop
// @route   PUT /api/shops/:id
// @access  Private/Admin
export const updateShop = async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404).json({ message: 'Shop not found' });
        return;
    }

    const { name, address, contactNumber, customPrices, outstandingBalance } = req.body;
    if (name) shop.name = name;
    if (address) shop.address = address;
    if (contactNumber !== undefined) shop.contactNumber = contactNumber;
    if (customPrices) shop.customPrices = customPrices;
    if (outstandingBalance !== undefined) shop.outstandingBalance = outstandingBalance;

    const updatedShop = await shop.save();
    res.json(updatedShop);
};

// @desc    Delete Shop (Soft)
// @route   DELETE /api/shops/:id
// @access  Private/Admin
export const deleteShop = async (req: Request, res: Response) => {
    const shop = await Shop.findById(req.params.id);
    if (!shop) {
        res.status(404).json({ message: 'Shop not found' });
        return;
    }
    shop.isActive = false;
    await shop.save();
    res.json({ message: 'Shop removed' });
};

// @desc    Get Complete Shop History (Bills + Payments merged chronologically)
// @route   GET /api/shops/:id/history
// @access  Private/Admin
export const getShopHistory = async (req: AuthRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const shopId = req.params.id;

    try {
        const shop = await Shop.findById(shopId);
        if (!shop) {
            res.status(404).json({ message: 'Shop not found' });
            return;
        }

        let dateFilter: any = {};
        if (startDate && endDate) {
            dateFilter = {
                $gte: new Date(startDate as string),
                $lte: new Date(endDate as string),
            };
        }

        // Fetch bills (include deleted ones marked for admin viewing)
        const billQuery: any = { shopId };
        if (dateFilter.$gte) billQuery.date = dateFilter;

        const bills = await Bill.find(billQuery)
            .populate('driverId', 'name')
            .populate('vehicleId', 'registrationNumber')
            .populate('items.productId', 'name unit')
            .select('+items.costPriceSnapshot')
            .sort({ date: 1 })
            .lean();

        // Fetch payments
        const paymentQuery: any = { shopId };
        if (dateFilter.$gte) paymentQuery.date = dateFilter;

        const payments = await Payment.find(paymentQuery)
            .populate('driverId', 'name')
            .populate('billId', 'totalAmount')
            .sort({ date: 1 })
            .lean();

        // Merge & sort chronologically
        const transactions: any[] = [];

        bills.forEach(bill => {
            transactions.push({
                type: 'BILL',
                _id: bill._id,
                date: bill.date,
                data: bill,
                amount: bill.totalAmount,
                paidAmount: bill.paidAmount,
                balanceOnBill: bill.balanceOnBill,
                driver: bill.driverId,
                vehicle: bill.vehicleId,
                items: bill.items,
                isDeleted: bill.isDeleted || false,
            });
        });

        payments.forEach(payment => {
            transactions.push({
                type: 'PAYMENT',
                _id: payment._id,
                date: payment.date,
                data: payment,
                amount: payment.amount,
                driver: payment.driverId,
                outstandingAfter: payment.outstandingBalanceSnapshot,
            });
        });

        // Sort by date ascending (A to Z)
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate running balance
        let runningBalance = 0;
        const enriched = transactions.map(t => {
            if (t.type === 'BILL' && !t.isDeleted) {
                runningBalance += t.balanceOnBill;
            } else if (t.type === 'PAYMENT') {
                runningBalance -= t.amount;
                runningBalance = Math.max(0, runningBalance);
            }
            return { ...t, runningBalance };
        });

        res.json({
            shop: { _id: shop._id, name: shop.name, address: shop.address },
            currentOutstanding: shop.outstandingBalance,
            totalBills: bills.filter(b => !b.isDeleted).length,
            totalPayments: payments.length,
            transactions: enriched,
        });

    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
