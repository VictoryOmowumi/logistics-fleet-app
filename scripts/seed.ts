// Seed script for populating the database with test data
// Run with: npx tsx scripts/seed.ts

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI;

// Define schemas inline to avoid import issues
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: 'dispatcher' },
}, { timestamps: true });

const VehicleSchema = new mongoose.Schema({
  name: String,
  plateNumber: { type: String, unique: true },
  type: String,
  status: { type: String, default: 'available' },
  capacity: Number,
  fuelType: String,
  mileage: Number,
}, { timestamps: true });

const DriverSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  status: { type: String, default: 'inactive' },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number],
  },
  vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  licenseNumber: String,
  licenseExpiry: Date,
}, { timestamps: true });

const OrderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  status: { type: String, default: 'pending' },
  customer: {
    name: String,
    email: String,
    phone: String,
  },
  pickup: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    scheduledTime: Date,
  },
  delivery: {
    address: String,
    city: String,
    state: String,
    zipCode: String,
    scheduledTime: Date,
  },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  items: [{
    description: String,
    quantity: Number,
    weight: Number,
  }],
  priority: { type: String, default: 'medium' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    if (!MONGODB_URI) {
      throw new Error("MONGODB_URI is not set");
    }

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Vehicle = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
    const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);
    const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Vehicle.deleteMany({});
    await Driver.deleteMany({});
    await Order.deleteMany({});

    // Create admin user
    console.log('👤 Creating users...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@truckco.com',
      password: hashedPassword,
      role: 'admin',
    });

    const dispatcher = await User.create({
      name: 'John Freightman',
      email: 'dispatcher@truckco.com',
      password: hashedPassword,
      role: 'dispatcher',
    });

    console.log('   ✓ Created 2 users');

    // Create vehicles
    console.log('🚛 Creating vehicles...');
    const vehicles = await Vehicle.insertMany([
      {
        name: 'Ford Transit #142',
        plateNumber: 'TX-142-FT',
        type: 'van',
        status: 'in_use',
        capacity: 1500,
        fuelType: 'diesel',
        mileage: 45000,
      },
      {
        name: 'Mercedes Sprinter #087',
        plateNumber: 'TX-087-MS',
        type: 'van',
        status: 'in_use',
        capacity: 2000,
        fuelType: 'diesel',
        mileage: 32000,
      },
      {
        name: 'Ram ProMaster #203',
        plateNumber: 'TX-203-RP',
        type: 'van',
        status: 'available',
        capacity: 1800,
        fuelType: 'gasoline',
        mileage: 28000,
      },
      {
        name: 'Freightliner M2 #501',
        plateNumber: 'TX-501-FM',
        type: 'truck',
        status: 'in_use',
        capacity: 8000,
        fuelType: 'diesel',
        mileage: 120000,
      },
      {
        name: 'Isuzu NPR #302',
        plateNumber: 'TX-302-IN',
        type: 'truck',
        status: 'maintenance',
        capacity: 5000,
        fuelType: 'diesel',
        mileage: 89000,
      },
    ]);
    console.log(`   ✓ Created ${vehicles.length} vehicles`);

    // Create drivers (with Dallas area coordinates)
    console.log('🧑‍✈️ Creating drivers...');
    const drivers = await Driver.insertMany([
      {
        name: 'Mike Johnson',
        email: 'mike.johnson@truckco.com',
        phone: '+1 (555) 123-4567',
        status: 'active',
        location: { type: 'Point', coordinates: [-96.7970, 32.7767] }, // Dallas downtown
        vehicle: vehicles[0]._id,
        licenseNumber: 'DL-TX-123456',
        licenseExpiry: new Date('2026-06-15'),
      },
      {
        name: 'Sarah Williams',
        email: 'sarah.williams@truckco.com',
        phone: '+1 (555) 234-5678',
        status: 'active',
        location: { type: 'Point', coordinates: [-96.8200, 32.7850] }, // Oak Cliff
        vehicle: vehicles[1]._id,
        licenseNumber: 'DL-TX-234567',
        licenseExpiry: new Date('2025-09-20'),
      },
      {
        name: 'James Rodriguez',
        email: 'james.rodriguez@truckco.com',
        phone: '+1 (555) 345-6789',
        status: 'active',
        location: { type: 'Point', coordinates: [-96.7500, 32.8100] }, // East Dallas
        vehicle: vehicles[3]._id,
        licenseNumber: 'DL-TX-345678',
        licenseExpiry: new Date('2026-03-10'),
      },
      {
        name: 'Emily Chen',
        email: 'emily.chen@truckco.com',
        phone: '+1 (555) 456-7890',
        status: 'on_break',
        location: { type: 'Point', coordinates: [-96.8500, 32.7600] }, // West Dallas
        vehicle: vehicles[2]._id,
        licenseNumber: 'DL-TX-456789',
        licenseExpiry: new Date('2025-12-01'),
      },
      {
        name: 'David Thompson',
        email: 'david.thompson@truckco.com',
        phone: '+1 (555) 567-8901',
        status: 'inactive',
        licenseNumber: 'DL-TX-567890',
        licenseExpiry: new Date('2026-08-25'),
      },
    ]);
    console.log(`   ✓ Created ${drivers.length} drivers`);

    // Create orders
    console.log('📦 Creating orders...');
    const orders = await Order.insertMany([
      {
        orderNumber: 'ORD-2412-0001',
        status: 'in_transit',
        customer: { name: 'Acme Corporation', email: 'orders@acme.com', phone: '+1 (555) 100-0001' },
        pickup: { address: '123 Warehouse Blvd', city: 'Dallas', state: 'TX', zipCode: '75201', scheduledTime: new Date() },
        delivery: { address: '456 Business Park Dr', city: 'Plano', state: 'TX', zipCode: '75024' },
        assignedDriver: drivers[0]._id,
        assignedVehicle: vehicles[0]._id,
        items: [{ description: 'Electronics Equipment', quantity: 5, weight: 150 }],
        priority: 'high',
        createdBy: dispatcher._id,
      },
      {
        orderNumber: 'ORD-2412-0002',
        status: 'picked_up',
        customer: { name: 'TechStart Inc', email: 'shipping@techstart.io', phone: '+1 (555) 100-0002' },
        pickup: { address: '789 Distribution Center', city: 'Irving', state: 'TX', zipCode: '75038' },
        delivery: { address: '321 Innovation Way', city: 'Richardson', state: 'TX', zipCode: '75080' },
        assignedDriver: drivers[1]._id,
        assignedVehicle: vehicles[1]._id,
        items: [{ description: 'Server Equipment', quantity: 2, weight: 300 }],
        priority: 'urgent',
        createdBy: dispatcher._id,
      },
      {
        orderNumber: 'ORD-2412-0003',
        status: 'assigned',
        customer: { name: 'Local Retail Store', email: 'inventory@localretail.com', phone: '+1 (555) 100-0003' },
        pickup: { address: '555 Supply Chain Rd', city: 'Arlington', state: 'TX', zipCode: '76010' },
        delivery: { address: '777 Main Street', city: 'Fort Worth', state: 'TX', zipCode: '76102' },
        assignedDriver: drivers[2]._id,
        assignedVehicle: vehicles[3]._id,
        items: [{ description: 'Retail Merchandise', quantity: 20, weight: 500 }],
        priority: 'medium',
        createdBy: admin._id,
      },
      {
        orderNumber: 'ORD-2412-0004',
        status: 'pending',
        customer: { name: 'Medical Supplies Co', email: 'urgent@medsupply.com', phone: '+1 (555) 100-0004' },
        pickup: { address: '900 Healthcare Blvd', city: 'Dallas', state: 'TX', zipCode: '75230' },
        delivery: { address: '1200 Hospital Dr', city: 'Garland', state: 'TX', zipCode: '75040' },
        items: [{ description: 'Medical Equipment', quantity: 3, weight: 75 }],
        priority: 'urgent',
        createdBy: dispatcher._id,
      },
      {
        orderNumber: 'ORD-2412-0005',
        status: 'delivered',
        customer: { name: 'Office Depot', email: 'delivery@officedepot.com', phone: '+1 (555) 100-0005' },
        pickup: { address: '111 Office Park', city: 'Frisco', state: 'TX', zipCode: '75034' },
        delivery: { address: '222 Corporate Center', city: 'McKinney', state: 'TX', zipCode: '75070' },
        assignedDriver: drivers[0]._id,
        assignedVehicle: vehicles[0]._id,
        items: [{ description: 'Office Furniture', quantity: 10, weight: 400 }],
        priority: 'low',
        createdBy: admin._id,
      },
    ]);
    console.log(`   ✓ Created ${orders.length} orders`);

    console.log('\n✅ Database seeded successfully!\n');
    console.log('📋 Login credentials:');
    console.log('   Admin:      admin@truckco.com / password123');
    console.log('   Dispatcher: dispatcher@truckco.com / password123\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
