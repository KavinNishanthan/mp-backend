// Importing packages
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBillItem {
  productId: Types.ObjectId;
  quantity: number;
  sellingPrice: number;
  total: number;
  costPriceSnapshot: number;
}

export interface IBill extends Document {
  shopId: Types.ObjectId;
  vehicleId: Types.ObjectId;
  driverId: Types.ObjectId;
  date: Date;
  items: IBillItem[];
  totalAmount: number;
  paidAmount: number;
  balanceOnBill: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: Types.ObjectId;
}

const billSchema: Schema = new Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shop',
      required: true
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        sellingPrice: {
          type: Number,
          required: true
        },
        total: {
          type: Number,
          required: true
        },
        costPriceSnapshot: {
          type: Number,
          required: true,
          select: false
        }
      }
    ],
    totalAmount: {
      type: Number,
      required: true
    },
    paidAmount: {
      type: Number,
      default: 0
    },
    balanceOnBill: {
      type: Number,
      default: 0
    },
    isDeleted: {
      type: Boolean,
      default: false
    },
    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  { timestamps: true }
);

export default mongoose.model<IBill>('Bill', billSchema);
