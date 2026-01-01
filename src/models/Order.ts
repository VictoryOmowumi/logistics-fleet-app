import mongoose, { Schema, Document, Model } from "mongoose";
import Counter from "@/models/Counter";

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  referenceNumber?: string;
  customer: {
    name: string;
    email?: string;
    phone: string;
  };
  pickup: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number];
    };
    scheduledTime?: Date;
    actualTime?: Date;
    notes?: string;
  };
  delivery: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    coordinates?: {
      type: 'Point';
      coordinates: [number, number];
    };
    scheduledTime?: Date;
    actualTime?: Date;
    notes?: string;
  };
  assignedDriver?: mongoose.Types.ObjectId;
  assignedVehicle?: mongoose.Types.ObjectId;
  items: {
    description: string;
    sku?: string;
    quantity: number;
    dimensions?: {
      length: number;
      width: number;
      height: number;
      unit?: 'in' | 'cm';
    };
    weight?: number;
    status?: 'picked' | 'packed' | 'pending';
  }[];
  totalWeight?: number;
  totalVolume?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDistance?: number; // in km
  estimatedDuration?: number; // in minutes
  actualDistance?: number;
  actualDuration?: number;
  estimatedArrival?: Date;
  delayMinutes?: number;
  activityLog?: {
    message: string;
    timestamp: Date;
    actor?: string;
    type?: 'status' | 'event' | 'note';
  }[];
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      default: 'pending',
    },
    referenceNumber: String,
    customer: {
      name: { type: String, required: true },
      email: { type: String },
      phone: { type: String, required: true },
    },
    pickup: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number],
      },
      scheduledTime: Date,
      actualTime: Date,
      notes: String,
    },
    delivery: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      zipCode: { type: String, required: true },
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
        },
        coordinates: [Number],
      },
      scheduledTime: Date,
      actualTime: Date,
      notes: String,
    },
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
    },
    assignedVehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    items: [
      {
        description: { type: String, required: true },
        sku: String,
        quantity: { type: Number, required: true, default: 1 },
        dimensions: {
          length: Number,
          width: Number,
          height: Number,
          unit: { type: String, enum: ['in', 'cm'], default: 'in' },
        },
        weight: Number,
        status: { type: String, enum: ['picked', 'packed', 'pending'], default: 'pending' },
      },
    ],
    totalWeight: Number,
    totalVolume: Number,
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    estimatedDistance: Number,
    estimatedDuration: Number,
    actualDistance: Number,
    actualDuration: Number,
    estimatedArrival: Date,
    delayMinutes: Number,
    activityLog: [
      {
        message: { type: String, required: true },
        timestamp: { type: Date, required: true },
        actor: String,
        type: { type: String, enum: ['status', 'event', 'note'], default: 'event' },
      },
    ],
    notes: String,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate order number before saving
OrderSchema.pre('save', async function () {
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const counterKey = `order:${year}${month}`;
    const counter = await Counter.findByIdAndUpdate(
      counterKey,
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = `ORD-${year}${month}-${counter.seq.toString().padStart(4, '0')}`;
  }
});

// Indexes for efficient queries
OrderSchema.index({ status: 1 });
OrderSchema.index({ assignedDriver: 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ 'pickup.coordinates': '2dsphere' });
OrderSchema.index({ 'delivery.coordinates': '2dsphere' });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>('Order', OrderSchema);

export default Order;
