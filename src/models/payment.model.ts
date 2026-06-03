// Importing packages
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

const paymentSchema: Schema = new Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      default: null
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    date: {
      type: Date,
      default: Date.now
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    outstandingBalanceSnapshot: {
      type: Number,
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', paymentSchema);
