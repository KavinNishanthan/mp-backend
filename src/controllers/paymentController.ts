import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Payment from '../models/Payment';
import Shop from '../models/Shop'; // Corrected Import
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Record a Payment (Collection)
// @route   POST /api/payments
// @access  Private (Driver)
export const createPayment = async (req: AuthRequest, res: Response) => {
    const { shopId, amount, vehicleId } = req.body;

    if (amount <= 0) {
        res.status(400).json({ message: 'Amount must be greater than 0' });
        return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shop = await Shop.findById(shopId);
        if (!shop) throw new Error('Shop not found');

        // Prevent paying more than what's owed (no negative outstanding)
        if (shop.outstandingBalance <= 0) {
            throw new Error('This shop has no outstanding balance');
        }
        const effectiveAmount = Math.min(amount, shop.outstandingBalance);

        // Update Shop Balance (Reduce Debt, floor at 0)
        shop.outstandingBalance = Math.max(0, shop.outstandingBalance - effectiveAmount);
        await shop.save({ session });

        // Create Payment Record (use effectiveAmount)
        const payment = await Payment.create([{
            shopId,
            amount: effectiveAmount,
            driverId: req.user!._id,
            vehicleId, // Driver must be assigned to this vehicle
            outstandingBalanceSnapshot: shop.outstandingBalance,
            date: new Date(),
        }], { session });

        await session.commitTransaction();
        res.status(201).json(payment[0]);

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Get Payments (History)
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req: Request, res: Response) => {
    const { shopId } = req.query;

    let query: any = {};
    if (shopId) query.shopId = shopId;

    const payments = await Payment.find(query)
        .populate('shopId', 'name')
        .populate('driverId', 'name')
        .sort({ date: -1 });

    res.json(payments);
};
