import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IBillAuditLog extends Document {
    billId: Types.ObjectId;
    action: 'EDIT' | 'DELETE';
    originalData: Record<string, any>;
    modifiedData?: Record<string, any>;
    adminId: Types.ObjectId;
    reason?: string;
    timestamp: Date;
}

const billAuditLogSchema: Schema = new Schema({
    billId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bill',
        required: true,
        index: true,
    },
    action: {
        type: String,
        enum: ['EDIT', 'DELETE'],
        required: true,
    },
    originalData: {
        type: Schema.Types.Mixed,
        required: true,
    },
    modifiedData: {
        type: Schema.Types.Mixed,
        default: null,
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reason: String,
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true });

export default mongoose.model<IBillAuditLog>('BillAuditLog', billAuditLogSchema);
