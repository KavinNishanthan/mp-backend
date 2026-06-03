// Importing packages
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Importing models
import billModel from '../models/bill.model';
import shopModel from '../models/shop.model';
import productModel from '../models/product.model';
import stockModel from '../models/stock.model';
import paymentModel from '../models/payment.model';
import billAuditLogModel from '../models/bill-audit-log.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to create a new bill (sale) with stock deduction and payment recording
 */
const handleCreateBill = async (req: Request, res: Response) => {
  const { shopId, vehicleId, items, paidAmount } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.NO_ITEMS_IN_BILL
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await shopModel.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    const vehicleStock = await stockModel.findOne({ location: 'vehicle', vehicleId });
    if (!vehicleStock) throw new Error('Vehicle stock not found');

    let totalAmount = 0;
    const billItems = [];

    for (const item of items) {
      const product = await productModel.findById(item.productId);
      if (!product) throw new Error(`Product not found: ${item.productId}`);

      const stockItem = vehicleStock.items.find((i) => i.productId.toString() === item.productId);
      if (!stockItem || stockItem.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      let sellingPrice = product.defaultSellingPrice;
      const customPrice = shop.customPrices.find((cp) => cp.productId.toString() === item.productId);
      if (customPrice) {
        sellingPrice = customPrice.price;
      }

      const lineTotal = sellingPrice * item.quantity;
      totalAmount += lineTotal;

      billItems.push({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice,
        total: lineTotal,
        costPriceSnapshot: product.costPrice
      });

      stockItem.quantity -= item.quantity;
    }

    await vehicleStock.save({ session });

    const bill = new billModel({
      shopId,
      vehicleId,
      driverId: req.user!._id,
      items: billItems,
      totalAmount,
      paidAmount: paidAmount || 0,
      balanceOnBill: totalAmount - (paidAmount || 0)
    });

    await bill.save({ session });

    shop.outstandingBalance += totalAmount - (paidAmount || 0);
    await shop.save({ session });

    if (paidAmount > 0) {
      await paymentModel.create(
        [
          {
            shopId,
            billId: bill._id,
            amount: paidAmount,
            driverId: req.user!._id,
            vehicleId,
            outstandingBalanceSnapshot: shop.outstandingBalance
          }
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(201).json({
      status: httpStatusConstant.CREATED,
      code: 201,
      message: responseMessageConstant.BILL_CREATED,
      data: bill
    });
  } catch (error: any) {
    await session.abortTransaction();

    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch all bills with optional filters (shop, date range)
 */
const handleGetBills = async (req: Request, res: Response) => {
  try {
    const { shopId, startDate, endDate, includeDeleted } = req.query;

    let query: any = {};

    if (includeDeleted !== 'true') {
      query.isDeleted = { $ne: true };
    }

    if (shopId) query.shopId = shopId;

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string)
      };
    }

    const bills = await billModel
      .find(query)
      .populate('shopId', 'name')
      .populate('driverId', 'name')
      .populate('vehicleId', 'registrationNumber')
      .populate('items.productId', 'name unit')
      .select('+items.costPriceSnapshot')
      .sort({ date: -1 });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: bills
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
 * @description This function is used to fetch a single bill by ID
 */
const handleGetBillById = async (req: Request, res: Response) => {
  try {
    const bill = await billModel
      .findById(req.params.id)
      .populate('shopId', 'name address')
      .populate('driverId', 'name')
      .populate('vehicleId', 'registrationNumber')
      .populate('items.productId', 'name unit')
      .select('+items.costPriceSnapshot');

    if (!bill) {
      return res.status(404).json({
        status: httpStatusConstant.NOT_FOUND,
        code: 404,
        message: responseMessageConstant.BILL_NOT_FOUND
      });
    }

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: bill
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
 * @description This function is used to update a bill and its financial impact (Admin only)
 */
const handleUpdateBill = async (req: Request, res: Response) => {
  const { items, paidAmount, reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await billModel.findById(req.params.id).select('+items.costPriceSnapshot');

    if (!bill || bill.isDeleted) {
      throw new Error('Bill not found');
    }

    const shop = await shopModel.findById(bill.shopId);
    if (!shop) throw new Error('Shop not found');

    const originalData = {
      items: bill.items.map((i) => ({ ...(i as any).toObject() })),
      totalAmount: bill.totalAmount,
      paidAmount: bill.paidAmount,
      balanceOnBill: bill.balanceOnBill
    };

    const oldImpact = bill.totalAmount - bill.paidAmount;

    let newTotalAmount = 0;
    const newBillItems = [];

    if (items && items.length > 0) {
      for (const item of items) {
        const product = await productModel.findById(item.productId);
        if (!product) throw new Error(`Product not found: ${item.productId}`);

        const sellingPrice = item.sellingPrice || product.defaultSellingPrice;
        const lineTotal = sellingPrice * item.quantity;
        newTotalAmount += lineTotal;

        newBillItems.push({
          productId: item.productId,
          quantity: item.quantity,
          sellingPrice,
          total: lineTotal,
          costPriceSnapshot: item.costPriceSnapshot || product.costPrice
        });
      }

      bill.items = newBillItems as any;
      bill.totalAmount = newTotalAmount;
    }

    const newPaidAmount = paidAmount !== undefined ? paidAmount : bill.paidAmount;
    bill.paidAmount = newPaidAmount;
    bill.balanceOnBill = bill.totalAmount - newPaidAmount;

    const newImpact = bill.totalAmount - newPaidAmount;
    shop.outstandingBalance = shop.outstandingBalance - oldImpact + newImpact;
    shop.outstandingBalance = Math.max(0, shop.outstandingBalance);

    await bill.save({ session });
    await shop.save({ session });

    await billAuditLogModel.create(
      [
        {
          billId: bill._id,
          action: 'EDIT',
          originalData,
          modifiedData: {
            items: bill.items.map((i) => ({ ...(i as any).toObject() })),
            totalAmount: bill.totalAmount,
            paidAmount: bill.paidAmount,
            balanceOnBill: bill.balanceOnBill
          },
          adminId: req.user!._id,
          reason: reason || 'Admin edit'
        }
      ],
      { session }
    );

    await session.commitTransaction();

    const updatedBill = await billModel
      .findById(bill._id)
      .populate('shopId', 'name')
      .populate('driverId', 'name')
      .populate('items.productId', 'name unit')
      .select('+items.costPriceSnapshot');

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.BILL_UPDATED,
      data: updatedBill
    });
  } catch (error: any) {
    await session.abortTransaction();

    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to soft delete a bill and reverse its financial impact (Admin only)
 */
const handleDeleteBill = async (req: Request, res: Response) => {
  const { reason } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const bill = await billModel.findById(req.params.id).select('+items.costPriceSnapshot');

    if (!bill || bill.isDeleted) {
      throw new Error('Bill not found');
    }

    const shop = await shopModel.findById(bill.shopId);
    if (!shop) throw new Error('Shop not found');

    const originalData = bill.toObject();

    const balanceImpact = bill.totalAmount - bill.paidAmount;
    shop.outstandingBalance = Math.max(0, shop.outstandingBalance - balanceImpact);
    await shop.save({ session });

    bill.isDeleted = true;
    bill.deletedAt = new Date();
    bill.deletedBy = req.user!._id as any;
    await bill.save({ session });

    await billAuditLogModel.create(
      [
        {
          billId: bill._id,
          action: 'DELETE',
          originalData,
          adminId: req.user!._id,
          reason: reason || 'Admin deletion'
        }
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      message: responseMessageConstant.BILL_DELETED
    });
  } catch (error: any) {
    await session.abortTransaction();

    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: error.message
    });
  } finally {
    session.endSession();
  }
};

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to fetch the audit log for a bill (Admin only)
 */
const handleGetBillAuditLog = async (req: Request, res: Response) => {
  try {
    const logs = await billAuditLogModel
      .find({ billId: req.params.id })
      .populate('adminId', 'name')
      .sort({ timestamp: -1 });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: logs
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleCreateBill, handleGetBills, handleGetBillById, handleUpdateBill, handleDeleteBill, handleGetBillAuditLog };
