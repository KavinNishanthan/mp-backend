import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Bill from '../models/Bill';
import Shop from '../models/Shop';
import Product from '../models/Product';
import Stock from '../models/Stock';
import Payment from '../models/Payment';
import BillAuditLog from '../models/BillAuditLog';
import { AuthRequest } from '../middleware/authMiddleware';

// @desc    Create a new Bill (Sale)
// @route   POST /api/bills
// @access  Private (Driver)
export const createBill = async (req: AuthRequest, res: Response) => {
    const { shopId, vehicleId, items, paidAmount } = req.body;
    // items: [{ productId, quantity }]

    if (!items || items.length === 0) {
        res.status(400).json({ message: 'No items in bill' });
        return;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const shop = await Shop.findById(shopId);
        if (!shop) throw new Error('Shop not found');

        // Verify Vehicle Stock
        const vehicleStock = await Stock.findOne({ location: 'vehicle', vehicleId });
        if (!vehicleStock) throw new Error('Vehicle stock not found');

        let totalAmount = 0;
        const billItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error(`Product not found: ${item.productId}`);

            // Check Stock Availability
            const stockItem = vehicleStock.items.find(i => i.productId.toString() === item.productId);
            if (!stockItem || stockItem.quantity < item.quantity) {
                throw new Error(`Insufficient stock for ${product.name}`);
            }

            // Determine Selling Price (Custom > Default)
            let sellingPrice = product.defaultSellingPrice;
            const customPrice = shop.customPrices.find(cp => cp.productId.toString() === item.productId);
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
                costPriceSnapshot: product.costPrice, // Critical for Profit Calculation
            });

            // Reduce Stock
            stockItem.quantity -= item.quantity;
        }

        await vehicleStock.save({ session });

        // Create Bill
        const bill = new Bill({
            shopId,
            vehicleId,
            driverId: req.user!._id,
            items: billItems,
            totalAmount,
            paidAmount: paidAmount || 0,
            balanceOnBill: totalAmount - (paidAmount || 0),
        });

        await bill.save({ session });

        // Update Shop Balance
        // Increase debt by Bill Total, Decrease by Paid Amount (Net: +BalanceOnBill)
        shop.outstandingBalance += (totalAmount - (paidAmount || 0));
        await shop.save({ session });

        // If payment is made, record it in Payment Collection
        if (paidAmount > 0) {
            await Payment.create([{
                shopId,
                billId: bill._id,
                amount: paidAmount,
                driverId: req.user!._id,
                vehicleId,
                outstandingBalanceSnapshot: shop.outstandingBalance, // Balance AFTER this transaction
            }], { session });
        }

        await session.commitTransaction();
        res.status(201).json(bill);

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Get All Bills (Filter by Shop, Date, Driver)
// @route   GET /api/bills
// @access  Private
export const getBills = async (req: AuthRequest, res: Response) => {
    const { shopId, startDate, endDate, includeDeleted } = req.query;

    let query: any = {};

    // By default exclude soft-deleted bills
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

    const bills = await Bill.find(query)
        .populate('shopId', 'name')
        .populate('driverId', 'name')
        .populate('vehicleId', 'registrationNumber')
        .populate('items.productId', 'name unit')
        .select('+items.costPriceSnapshot')
        .sort({ date: -1 });

    res.json(bills);
};

// @desc    Get Single Bill by ID
// @route   GET /api/bills/:id
// @access  Private
export const getBillById = async (req: AuthRequest, res: Response) => {
    try {
        const bill = await Bill.findById(req.params.id)
            .populate('shopId', 'name address')
            .populate('driverId', 'name')
            .populate('vehicleId', 'registrationNumber')
            .populate('items.productId', 'name unit')
            .select('+items.costPriceSnapshot');

        if (!bill) {
            res.status(404).json({ message: 'Bill not found' });
            return;
        }
        res.json(bill);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update Bill (Admin Only)
// @route   PUT /api/bills/:id
// @access  Private/Admin
export const updateBill = async (req: AuthRequest, res: Response) => {
    const { items, paidAmount, reason } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const bill = await Bill.findById(req.params.id).select('+items.costPriceSnapshot');
        if (!bill || bill.isDeleted) {
            throw new Error('Bill not found');
        }

        const shop = await Shop.findById(bill.shopId);
        if (!shop) throw new Error('Shop not found');

        // Save original data for audit
        const originalData = {
            items: bill.items.map(i => ({ ...(i as any).toObject() })),
            totalAmount: bill.totalAmount,
            paidAmount: bill.paidAmount,
            balanceOnBill: bill.balanceOnBill,
        };

        // Reverse old outstanding impact
        const oldImpact = bill.totalAmount - bill.paidAmount;

        // Recalculate with new items
        let newTotalAmount = 0;
        const newBillItems = [];

        if (items && items.length > 0) {
            for (const item of items) {
                const product = await Product.findById(item.productId);
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                const sellingPrice = item.sellingPrice || product.defaultSellingPrice;
                const lineTotal = sellingPrice * item.quantity;
                newTotalAmount += lineTotal;

                newBillItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    sellingPrice,
                    total: lineTotal,
                    costPriceSnapshot: item.costPriceSnapshot || product.costPrice,
                });
            }

            bill.items = newBillItems as any;
            bill.totalAmount = newTotalAmount;
        }

        const newPaidAmount = paidAmount !== undefined ? paidAmount : bill.paidAmount;
        bill.paidAmount = newPaidAmount;
        bill.balanceOnBill = bill.totalAmount - newPaidAmount;

        // Update outstanding: reverse old impact, apply new impact
        const newImpact = bill.totalAmount - newPaidAmount;
        shop.outstandingBalance = shop.outstandingBalance - oldImpact + newImpact;
        shop.outstandingBalance = Math.max(0, shop.outstandingBalance);

        await bill.save({ session });
        await shop.save({ session });

        // Create audit log
        await BillAuditLog.create([{
            billId: bill._id,
            action: 'EDIT',
            originalData,
            modifiedData: {
                items: bill.items.map(i => ({ ...(i as any).toObject() })),
                totalAmount: bill.totalAmount,
                paidAmount: bill.paidAmount,
                balanceOnBill: bill.balanceOnBill,
            },
            adminId: req.user!._id,
            reason: reason || 'Admin edit',
        }], { session });

        await session.commitTransaction();

        const updatedBill = await Bill.findById(bill._id)
            .populate('shopId', 'name')
            .populate('driverId', 'name')
            .populate('items.productId', 'name unit')
            .select('+items.costPriceSnapshot');

        res.json(updatedBill);

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Delete Bill (Soft Delete, Admin Only)
// @route   DELETE /api/bills/:id
// @access  Private/Admin
export const deleteBill = async (req: AuthRequest, res: Response) => {
    const { reason } = req.body;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const bill = await Bill.findById(req.params.id).select('+items.costPriceSnapshot');
        if (!bill || bill.isDeleted) {
            throw new Error('Bill not found');
        }

        const shop = await Shop.findById(bill.shopId);
        if (!shop) throw new Error('Shop not found');

        // Save original data for audit
        const originalData = bill.toObject();

        // Reverse the outstanding balance impact
        const balanceImpact = bill.totalAmount - bill.paidAmount;
        shop.outstandingBalance = Math.max(0, shop.outstandingBalance - balanceImpact);
        await shop.save({ session });

        // Soft delete
        bill.isDeleted = true;
        bill.deletedAt = new Date();
        bill.deletedBy = req.user!._id;
        await bill.save({ session });

        // Create audit log
        await BillAuditLog.create([{
            billId: bill._id,
            action: 'DELETE',
            originalData,
            adminId: req.user!._id,
            reason: reason || 'Admin deletion',
        }], { session });

        await session.commitTransaction();
        res.json({ message: 'Bill deleted successfully' });

    } catch (error: any) {
        await session.abortTransaction();
        res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

// @desc    Get Audit Log for a Bill
// @route   GET /api/bills/:id/audit
// @access  Private/Admin
export const getBillAuditLog = async (req: AuthRequest, res: Response) => {
    try {
        const logs = await BillAuditLog.find({ billId: req.params.id })
            .populate('adminId', 'name')
            .sort({ timestamp: -1 });
        res.json(logs);
    } catch (error: any) {
        res.status(500).json({ message: error.message });
    }
};
