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

const billSchema: Schema = new Schema({
    shopId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Shop',
        required: true,
    },
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        sellingPrice: {
            type: Number,
            required: true,
            description: "Actual price sold at (could be custom or default)"
        },
        total: {
            type: Number,
            required: true,
        },
        // For Profit Calculation (Admin Only) - Snapshotting cost price at time of sale
        costPriceSnapshot: {
            type: Number,
            required: true,
            select: false, // Hidden by default, explicit selection required
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
    },
    paidAmount: {
        type: Number,
        default: 0,
    },
    // Derived field (totalAmount - paidAmount) - useful for quick checks, but logic should rely on Payment records
    balanceOnBill: {
        type: Number,
        default: 0,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
}, { timestamps: true });

export default mongoose.model<IBill>('Bill', billSchema);
