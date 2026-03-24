import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IStockMovementItem {
    productId: Types.ObjectId;
    quantity: number;
}

export interface IStockMovement extends Document {
    type: 'FACTORY_TO_WAREHOUSE' | 'WAREHOUSE_TO_VEHICLE' | 'VEHICLE_TO_WAREHOUSE' | 'VEHICLE_TO_VEHICLE' | 'CORRECTION' | 'SALE';
    sourceLocation?: 'warehouse' | 'vehicle' | 'factory';
    sourceVehicleId?: Types.ObjectId;
    destinationLocation?: 'warehouse' | 'vehicle';
    destinationVehicleId?: Types.ObjectId;
    items: IStockMovementItem[];
    date: Date;
    performedBy: Types.ObjectId;
    description?: string;
}

const stockMovementSchema: Schema = new Schema({
    type: {
        type: String,
        enum: [
            'FACTORY_TO_WAREHOUSE',
            'WAREHOUSE_TO_VEHICLE',
            'VEHICLE_TO_WAREHOUSE',
            'VEHICLE_TO_VEHICLE',
            'CORRECTION',
            'SALE' // Implicit movement, might not need strict logging here if Bills cover it, but good for completeness
        ],
        required: true,
    },
    sourceLocation: {
        type: String,
        enum: ['warehouse', 'vehicle', 'factory'],
    },
    sourceVehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
    },
    destinationLocation: {
        type: String,
        enum: ['warehouse', 'vehicle'],
    },
    destinationVehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
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
        }
    }],
    date: {
        type: Date,
        default: Date.now,
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    description: String,
}, { timestamps: true });

export default mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
