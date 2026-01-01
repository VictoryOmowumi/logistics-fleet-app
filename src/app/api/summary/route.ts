import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import Order from '@/models/Order';
import Driver from '@/models/Driver';
import Vehicle from '@/models/Vehicle';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Date window for trends (last 7 days)
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - 6);

    const [
      ordersTotal,
      ordersPending,
      ordersInTransit,
      ordersDelivered,
      ordersCancelled,
      ordersUnassigned,
      ordersHighPriority,
      orderTrendAgg,
      driversTotal,
      driversActive,
      driversOnBreak,
      driversOffDuty,
      vehiclesTotal,
      vehiclesAvailable,
      vehiclesInUse,
      vehiclesMaintenance,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'pending' }),
      Order.countDocuments({ status: { $in: ['assigned', 'picked_up', 'in_transit'] } }),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'cancelled' }),
      Order.countDocuments({ $or: [{ assignedDriver: { $exists: false } }, { assignedDriver: null }] }),
      Order.countDocuments({ priority: { $in: ['high', 'urgent'] } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Driver.countDocuments({}),
      Driver.countDocuments({ status: 'active' }),
      Driver.countDocuments({ status: 'on_break' }),
      Driver.countDocuments({ status: 'off_duty' }),
      Vehicle.countDocuments({}),
      Vehicle.countDocuments({ status: 'available' }),
      Vehicle.countDocuments({ status: 'in_use' }),
      Vehicle.countDocuments({ status: 'maintenance' }),
      Order.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select('orderNumber status priority customer delivery pickup createdAt')
        .lean(),
    ]);

    // Normalize trend to 7 days array
    const trendMap = new Map(orderTrendAgg.map((entry: { _id: string; count: number }) => [entry._id, entry.count]));
    const orderTrend = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      const key = d.toISOString().slice(0, 10);
      return {
        date: key,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: trendMap.get(key) || 0,
      };
    });

    const alerts: string[] = [];
    if (ordersUnassigned > 0) alerts.push(`${ordersUnassigned} orders are unassigned`);
    if (ordersHighPriority > 0) alerts.push(`${ordersHighPriority} high-priority orders need attention`);
    if (vehiclesMaintenance > 0) alerts.push(`${vehiclesMaintenance} vehicles in maintenance`);
    if (driversActive === 0) alerts.push('No drivers online');

    return NextResponse.json({
      metrics: {
        orders: {
          total: ordersTotal,
          pending: ordersPending,
          inTransit: ordersInTransit,
          delivered: ordersDelivered,
          cancelled: ordersCancelled,
          unassigned: ordersUnassigned,
          highPriority: ordersHighPriority,
        },
        drivers: {
          total: driversTotal,
          active: driversActive,
          onBreak: driversOnBreak,
          offDuty: driversOffDuty,
          inactive: driversTotal - driversActive - driversOnBreak - driversOffDuty,
        },
        vehicles: {
          total: vehiclesTotal,
          available: vehiclesAvailable,
          inUse: vehiclesInUse,
          maintenance: vehiclesMaintenance,
          retired: vehiclesTotal - vehiclesAvailable - vehiclesInUse - vehiclesMaintenance,
        },
      },
      orderTrend,
      recentOrders: recentOrders.map((o) => ({
        id: o._id?.toString?.() ?? '',
        orderNumber: o.orderNumber,
        status: o.status,
        priority: o.priority,
        customer: o.customer?.name,
        dropoff: o.delivery?.city || o.delivery?.address,
        pickup: o.pickup?.city || o.pickup?.address,
        createdAt: o.createdAt,
      })),
      alerts,
    });
  } catch (error) {
    console.error('Error building summary:', error);
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 });
  }
}
