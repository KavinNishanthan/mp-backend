import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPayment extends Document {
    shopId: Types.ObjectId;
    billId?: Types.ObjectId;
    amount: number;
    date: Date;
    driverId: Types.ObjectId;
    vehicleId: Types.ObjectId;
    outstandingBalanceSnapshot: number;
}

const paymentSchema: Schema = new Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
    },
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        default: null, // Can be a general payment towards outstanding balance
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
    },
    // Snapshot of outstanding balance AFTER this payment
    outstandingBalanceSnapshot: {
        type: Number,
        required: true,
    }
}, { timestamps: true });

export default mongoose.model<IPayment>('Payment', paymentSchema);
