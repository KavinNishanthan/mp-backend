import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
    name: string;
    costPrice: number;
    defaultSellingPrice: number;
    unit: string;
    isActive: boolean;
}

const productSchema: Schema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    costPrice: {
        type: Number,
        required: true,
        min: 0,
        // Accessible only to Admin logic
    },
    defaultSellingPrice: {
        type: Number,
        required: true,
        min: 0,
    },
    unit: {
        type: String,
        required: true, // e.g., '100ml', '500ml', 'pkt'
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, { timestamps: true });

export default mongoose.model<IProduct>('Product', productSchema);
