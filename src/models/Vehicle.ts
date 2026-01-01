import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVehicle extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  plateNumber: string;
  type: 'truck' | 'van' | 'trailer' | 'pickup';
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  capacity: number; // in kg
  capacityUsed?: number; // percentage
  fuelType: 'diesel' | 'gasoline' | 'electric' | 'hybrid';
  mileage: number;
  odometer?: number;
  fuelLevel?: number;
  healthStatus?: 'good' | 'warning' | 'critical';
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  lastServiceDate?: Date;
  nextServiceDue?: Date;
  lastSyncedAt?: Date;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  assignedDriver?: mongoose.Types.ObjectId;
  maintenanceHistory?: {
    title: string;
    performedAt?: Date;
    status?: 'completed' | 'scheduled' | 'overdue';
    notes?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const VehicleSchema = new Schema<IVehicle>(
  {
    name: {
      type: String,
      required: [true, 'Vehicle name is required'],
      trim: true,
    },
    plateNumber: {
      type: String,
      required: [true, 'Plate number is required'],
      unique: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ['truck', 'van', 'trailer', 'pickup'],
      required: [true, 'Vehicle type is required'],
    },
    status: {
      type: String,
      enum: ['available', 'in_use', 'maintenance', 'retired'],
      default: 'available',
    },
    capacity: {
      type: Number,
      required: [true, 'Vehicle capacity is required'],
    },
    capacityUsed: Number,
    fuelType: {
      type: String,
      enum: ['diesel', 'gasoline', 'electric', 'hybrid'],
      default: 'diesel',
    },
    mileage: {
      type: Number,
      default: 0,
    },
    odometer: Number,
    fuelLevel: Number,
    healthStatus: {
      type: String,
      enum: ['good', 'warning', 'critical'],
      default: 'good',
    },
    vin: String,
    make: String,
    model: String,
    year: Number,
    color: String,
    lastServiceDate: {
      type: Date,
    },
    nextServiceDue: {
      type: Date,
    },
    lastSyncedAt: Date,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: undefined,
      },
    },
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    maintenanceHistory: [
      {
        title: { type: String, required: true },
        performedAt: Date,
        status: { type: String, enum: ['completed', 'scheduled', 'overdue'] },
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

VehicleSchema.index({ location: '2dsphere' });

const Vehicle: Model<IVehicle> =
  mongoose.models.Vehicle || mongoose.model<IVehicle>('Vehicle', VehicleSchema);

export default Vehicle;
