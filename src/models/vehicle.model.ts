// Importing packages
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVehicle extends Document {
  registrationNumber: string;
  name?: string;
  driverId?: Types.ObjectId;
  isActive: boolean;
}

const vehicleSchema: Schema = new Schema(
  {
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      trim: true
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

export default mongoose.model<IVehicle>('Vehicle', vehicleSchema);
