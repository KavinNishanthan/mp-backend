import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStockItem {
    productId: Types.ObjectId;
    quantity: number;
}

export interface IStock extends Document {
    location: 'warehouse' | 'vehicle';
    vehicleId?: Types.ObjectId;
    items: IStockItem[];
}

const stockSchema: Schema = new Schema({
    location: {
        type: String,
        enum: ['warehouse', 'vehicle'],
        required: true,
    },
    // If location is 'vehicle', this field is required
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        default: null,
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
            default: 0,
            min: 0,
        }
    }],
}, { timestamps: true });

// Ensure unique index so we don't have duplicate stock records for same vehicle
stockSchema.index({ location: 1, vehicleId: 1 }, { unique: true });

export default mongoose.model<IStock>('Stock', stockSchema);
