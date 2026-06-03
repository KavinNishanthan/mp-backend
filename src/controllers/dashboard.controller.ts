// Importing packages
import { Request, Response } from 'express';

// Importing models
import billModel from '../models/bill.model';
import shopModel from '../models/shop.model';
import paymentModel from '../models/payment.model';
import stockModel from '../models/stock.model';
import stockMovementModel from '../models/stock-movement.model';
import vehicleModel from '../models/vehicle.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch admin dashboard summary stats (cards)
 */
const handleGetAdminDashboardStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const shops = await shopModel.find({ isActive: true });
    const totalOutstanding = shops.reduce((acc, shop) => acc + Math.max(0, shop.outstandingBalance), 0);

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

    const bills = await billModel
      .find({
        date: { $gte: dateStart, $lte: dateEnd },
        isDeleted: { $ne: true }
      })
      .select('+items.costPriceSnapshot');

    const totalSales = bills.reduce((acc, bill) => acc + bill.totalAmount, 0);
    const totalCollections = bills.reduce((acc, bill) => acc + bill.paidAmount, 0);

    const payments = await paymentModel.find({
      date: { $gte: dateStart, $lte: dateEnd }
    });
    const paymentCollections = payments.reduce((acc, p) => acc + p.amount, 0);

    let totalProfit = 0;
    bills.forEach((bill) => {
      bill.items.forEach((item) => {
        totalProfit += (item.sellingPrice - item.costPriceSnapshot) * item.quantity;
      });
    });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        totalOutstanding,
        totalSales,
        totalCollections: totalCollections + paymentCollections,
        totalProfit,
        billCount: bills.length,
        paymentCount: payments.length
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch a comprehensive financial report with profit breakdowns
 */
const handleGetFinancialReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const billQuery: any = { isDeleted: { $ne: true } };
    if (dateFilter.$gte) billQuery.date = dateFilter;

    const bills = await billModel
      .find(billQuery)
      .populate('shopId', 'name')
      .populate('items.productId', 'name unit')
      .select('+items.costPriceSnapshot')
      .lean();

    const paymentQuery: any = {};
    if (dateFilter.$gte) paymentQuery.date = dateFilter;

    const payments = await paymentModel.find(paymentQuery).populate('shopId', 'name').lean();

    let totalSales = 0;
    let totalProfit = 0;
    let totalBillCollections = 0;
    const profitByProduct: Record<string, { name: string; unit: string; profit: number; sales: number; qty: number }> = {};
    const profitByShop: Record<string, { name: string; profit: number; sales: number; collections: number; outstanding: number }> = {};

    bills.forEach((bill) => {
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

    let totalPaymentCollections = 0;
    payments.forEach((p) => {
      totalPaymentCollections += p.amount;
      const sid = (p.shopId as any)?._id?.toString();
      if (sid && profitByShop[sid]) {
        profitByShop[sid].collections += p.amount;
      }
    });

    const allShops = await shopModel.find({ isActive: true }).select('name outstandingBalance').lean();
    allShops.forEach((shop) => {
      const sid = shop._id.toString();
      if (profitByShop[sid]) {
        profitByShop[sid].outstanding = Math.max(0, shop.outstandingBalance);
      }
    });

    const totalOutstanding = allShops.reduce((acc, s) => acc + Math.max(0, s.outstandingBalance), 0);
    const outstandingByShop = allShops
      .filter((s) => s.outstandingBalance > 0)
      .map((s) => ({ name: s.name, outstanding: s.outstandingBalance }))
      .sort((a, b) => b.outstanding - a.outstanding);

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        totalSales,
        totalCollections: totalBillCollections + totalPaymentCollections,
        totalProfit,
        totalOutstanding,
        billCount: bills.length,
        profitByProduct: Object.values(profitByProduct).sort((a, b) => b.profit - a.profit),
        profitByShop: Object.values(profitByShop).sort((a, b) => b.sales - a.sales),
        outstandingByShop
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch a profit report for a given date range
 */
const handleGetProfitReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    let query: any = { isDeleted: { $ne: true } };
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const bills = await billModel
      .find(query)
      .populate('shopId', 'name')
      .select('+items.costPriceSnapshot');

    let totalProfit = 0;
    let totalSales = 0;
    const profitByShop: Record<string, { name: string; profit: number; sales: number }> = {};

    bills.forEach((bill) => {
      let billProfit = 0;
      bill.items.forEach((item) => {
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

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        totalProfit,
        totalSales,
        profitByShop: Object.values(profitByShop)
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch the daily movement history for a specific vehicle
 */
const handleGetVehicleHistory = async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate } = req.query;

    const vehicle = await vehicleModel.findById(vehicleId).populate('driverId', 'name');

    if (!vehicle) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.VEHICLE_NOT_FOUND
      });
    }

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const movementQuery: any = {
      $or: [{ destinationVehicleId: vehicleId }, { sourceVehicleId: vehicleId }]
    };
    if (dateFilter.$gte) movementQuery.date = dateFilter;

    const movements = await stockMovementModel
      .find(movementQuery)
      .populate('items.productId', 'name unit')
      .populate('performedBy', 'name')
      .sort({ date: 1 })
      .lean();

    const billQuery: any = { vehicleId, isDeleted: { $ne: true } };
    if (dateFilter.$gte) billQuery.date = dateFilter;

    const bills = await billModel
      .find(billQuery)
      .populate('shopId', 'name')
      .populate('driverId', 'name')
      .populate('items.productId', 'name unit')
      .sort({ date: 1 })
      .lean();

    const timeline: any[] = [];

    movements.forEach((m) => {
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
        _id: m._id
      });
    });

    bills.forEach((b) => {
      timeline.push({
        type: 'DELIVERY',
        date: b.date,
        shop: b.shopId,
        driver: b.driverId,
        items: b.items,
        totalAmount: b.totalAmount,
        billId: b._id
      });
    });

    timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let totalLoaded = 0;
    let totalDelivered = 0;
    let totalReturned = 0;

    timeline.forEach((event) => {
      const qty = event.items?.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0) || 0;
      if (event.type === 'LOADING') totalLoaded += qty;
      else if (event.type === 'DELIVERY') totalDelivered += qty;
      else if (event.type === 'RETURN') totalReturned += qty;
    });

    const currentStock = await stockModel
      .findOne({ location: 'vehicle', vehicleId })
      .populate('items.productId', 'name unit')
      .lean();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        vehicle: {
          _id: vehicle._id,
          registrationNumber: vehicle.registrationNumber,
          driver: vehicle.driverId
        },
        summary: {
          totalLoaded,
          totalDelivered,
          totalReturned,
          closingStock: currentStock?.items?.reduce((acc, i) => acc + i.quantity, 0) || 0
        },
        currentStock: currentStock?.items || [],
        timeline
      }
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleGetAdminDashboardStats, handleGetFinancialReport, handleGetProfitReport, handleGetVehicleHistory };
