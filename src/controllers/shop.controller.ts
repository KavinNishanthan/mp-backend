// Importing packages
import { Request, Response } from 'express';

// Importing models
import shopModel from '../models/shop.model';
import billModel from '../models/bill.model';
import paymentModel from '../models/payment.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch all active shops
 */
const handleGetShops = async (req: Request, res: Response) => {
  try {
    const shops = await shopModel.find({ isActive: true }).sort({ name: 1 });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: shops
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
 * @description This function is used to fetch a single shop by ID
 */
const handleGetShopById = async (req: Request, res: Response) => {
  try {
    const shop = await shopModel.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.SHOP_NOT_FOUND
      });
    }

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: shop
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
 * @description This function is used to create a new shop
 */
const handleCreateShop = async (req: Request, res: Response) => {
  try {
    const { name, address, contactNumber, customPrices } = req.body;

    const shop = await shopModel.create({ name, address, contactNumber, customPrices });

    return res.status(201).json({
      status: httpStatusConstant.CREATED,
      code: 201,
      message: responseMessageConstant.SHOP_CREATED,
      data: shop
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
 * @description This function is used to update a shop by ID
 */
const handleUpdateShop = async (req: Request, res: Response) => {
  try {
    const shop = await shopModel.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.SHOP_NOT_FOUND
      });
    }

    const { name, address, contactNumber, customPrices, outstandingBalance } = req.body;

    if (name) shop.name = name;
    if (address) shop.address = address;
    if (contactNumber !== undefined) shop.contactNumber = contactNumber;
    if (customPrices) shop.customPrices = customPrices;
    if (outstandingBalance !== undefined) shop.outstandingBalance = outstandingBalance;

    const updatedShop = await shop.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.SHOP_UPDATED,
      data: updatedShop
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
 * @description This function is used to soft delete a shop by ID
 */
const handleDeleteShop = async (req: Request, res: Response) => {
  try {
    const shop = await shopModel.findById(req.params.id);

    if (!shop) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.SHOP_NOT_FOUND
      });
    }

    shop.isActive = false;
    await shop.save();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.SHOP_DELETED
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
 * @description This function is used to fetch the complete transaction history for a shop
 */
const handleGetShopHistory = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const shopId = req.params.id;

    const shop = await shopModel.findById(shopId);

    if (!shop) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.SHOP_NOT_FOUND
      });
    }

    let dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const billQuery: any = { shopId };
    if (dateFilter.$gte) billQuery.date = dateFilter;

    const bills = await billModel
      .find(billQuery)
      .populate('driverId', 'name')
      .populate('vehicleId', 'registrationNumber')
      .populate('items.productId', 'name unit')
      .select('+items.costPriceSnapshot')
      .sort({ date: 1 })
      .lean();

    const paymentQuery: any = { shopId };
    if (dateFilter.$gte) paymentQuery.date = dateFilter;

    const payments = await paymentModel
      .find(paymentQuery)
      .populate('driverId', 'name')
      .populate('billId', 'totalAmount')
      .sort({ date: 1 })
      .lean();

    const transactions: any[] = [];

    bills.forEach((bill) => {
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
        isDeleted: bill.isDeleted || false
      });
    });

    payments.forEach((payment) => {
      transactions.push({
        type: 'PAYMENT',
        _id: payment._id,
        date: payment.date,
        data: payment,
        amount: payment.amount,
        driver: payment.driverId,
        outstandingAfter: payment.outstandingBalanceSnapshot
      });
    });

    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const enriched = transactions.map((t) => {
      if (t.type === 'BILL' && !t.isDeleted) {
        runningBalance += t.balanceOnBill;
      } else if (t.type === 'PAYMENT') {
        runningBalance -= t.amount;
        runningBalance = Math.max(0, runningBalance);
      }
      return { ...t, runningBalance };
    });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: {
        shop: { _id: shop._id, name: shop.name, address: shop.address },
        currentOutstanding: shop.outstandingBalance,
        totalBills: bills.filter((b) => !b.isDeleted).length,
        totalPayments: payments.length,
        transactions: enriched
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

export default { handleGetShops, handleGetShopById, handleCreateShop, handleUpdateShop, handleDeleteShop, handleGetShopHistory };
