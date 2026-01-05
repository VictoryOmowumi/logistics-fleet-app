import mongoose, { Schema, Model } from 'mongoose';

export interface IDriver {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'on_break' | 'off_duty';
  employeeId?: string;
  employmentType?: 'full_time' | 'contract' | 'part_time';
  rating?: number;
  reviewsCount?: number;
  onTimeRate?: number;
  totalDeliveries?: number;
  distanceDriven?: number; // in km
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  vehicle?: mongoose.Types.ObjectId;
  licenseNumber: string;
  licenseExpiry: Date;
  avatar?: string;
  activityHistory?: {
    date: Date;
    routeId?: string;
    zone?: string;
    status?: 'in_progress' | 'completed' | 'late';
    durationMinutes?: number;
  }[];
  documents?: {
    title: string;
    url?: string;
    uploadedAt?: Date;
  }[];
  payroll?: {
    period: string;
    amount: number;
    status?: 'paid' | 'pending';
  }[];
  incidents?: {
    title: string;
    reportedAt?: Date;
    status?: 'open' | 'resolved';
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const DriverSchema = new Schema<IDriver>(
  {
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'on_break', 'off_duty'],
      default: 'inactive',
    },
    employeeId: String,
    employmentType: {
      type: String,
      enum: ['full_time', 'contract', 'part_time'],
      default: 'full_time',
    },
    rating: Number,
    reviewsCount: Number,
    onTimeRate: Number,
    totalDeliveries: Number,
    distanceDriven: Number,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: undefined,
      },
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    licenseNumber: {
      type: String,
      required: [true, 'License number is required'],
    },
    licenseExpiry: {
      type: Date,
      required: [true, 'License expiry date is required'],
    },
    avatar: {
      type: String,
    },
    activityHistory: [
      {
        date: { type: Date, required: true },
        routeId: String,
        zone: String,
        status: { type: String, enum: ['in_progress', 'completed', 'late'] },
        durationMinutes: Number,
      },
    ],
    documents: [
      {
        title: { type: String, required: true },
        url: String,
        uploadedAt: Date,
      },
    ],
    payroll: [
      {
        period: { type: String, required: true },
        amount: { type: Number, required: true },
        status: { type: String, enum: ['paid', 'pending'], default: 'pending' },
      },
    ],
    incidents: [
      {
        title: { type: String, required: true },
        reportedAt: Date,
        status: { type: String, enum: ['open', 'resolved'], default: 'open' },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for geospatial queries
DriverSchema.index({ location: '2dsphere' });

const Driver: Model<IDriver> =
  mongoose.models.Driver || mongoose.model<IDriver>('Driver', DriverSchema);

export default Driver;
