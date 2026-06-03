// Importing packages
import { Request, Response } from 'express';
import mongoose from 'mongoose';

// Importing models
import paymentModel from '../models/payment.model';
import shopModel from '../models/shop.model';

// Importing constants
import httpStatusConstant from '../constants/http-message.constant';
import responseMessageConstant from '../constants/response-message.constant';

/**
 * @createdBy Kavin Nishanthan P D
 * @description This function is used to record a payment (collection) against a shop's outstanding balance
 */
const handleCreatePayment = async (req: Request, res: Response) => {
  const { shopId, amount, vehicleId } = req.body;

  if (amount <= 0) {
    return res.status(400).json({
      status: httpStatusConstant.BAD_REQUEST,
      code: 400,
      message: responseMessageConstant.INVALID_PAYMENT_AMOUNT
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const shop = await shopModel.findById(shopId);
    if (!shop) throw new Error('Shop not found');

    if (shop.outstandingBalance <= 0) {
      throw new Error('This shop has no outstanding balance');
    }

    const effectiveAmount = Math.min(amount, shop.outstandingBalance);

    shop.outstandingBalance = Math.max(0, shop.outstandingBalance - effectiveAmount);
    await shop.save({ session });

    const payment = await paymentModel.create(
      [
        {
          shopId,
          amount: effectiveAmount,
          driverId: req.user!._id,
          vehicleId,
          outstandingBalanceSnapshot: shop.outstandingBalance,
          date: new Date()
        }
      ],
      { session }
    );

    await session.commitTransaction();

    return res.status(201).json({
      status: httpStatusConstant.CREATED,
      code: 201,
      message: responseMessageConstant.PAYMENT_CREATED,
      data: payment[0]
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
 * @description This function is used to fetch payment history with optional shop filter
 */
const handleGetPayments = async (req: Request, res: Response) => {
  try {
    const { shopId } = req.query;

    let query: any = {};
    if (shopId) query.shopId = shopId;

    const payments = await paymentModel
      .find(query)
      .populate('shopId', 'name')
      .populate('driverId', 'name')
      .sort({ date: -1 });

    return res.status(200).json({
      status: httpStatusConstant.OK,
      code: 200,
      data: payments
    });
  } catch (err: any) {
    return res.status(500).json({
      status: httpStatusConstant.ERROR,
      code: 500,
      message: responseMessageConstant.SOMETHING_WENT_WRONG
    });
  }
};

export default { handleCreatePayment, handleGetPayments };
