import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICustomPrice {
    productId: Types.ObjectId;
    price: number;
}

export interface IShop extends Document {
    name: string;
    address: string;
    contactNumber?: string;
    customPrices: ICustomPrice[];
    outstandingBalance: number;
    isActive: boolean;
}

const shopSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
    },
    contactNumber: {
        type: String,
        trim: true,
    },
    // Custom price overrides for this shop
    customPrices: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        }
    }],
    // Outstanding debt
    outstandingBalance: {
        type: Number,
        default: 0,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

export default mongoose.model<IShop>('Shop', shopSchema);
