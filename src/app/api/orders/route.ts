import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed, pickFields } from "@/lib/api/utils";
import "@/models/Driver";
import "@/models/Vehicle";

// GET all orders
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const driverId = searchParams.get('driverId');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (driverId) query.assignedDriver = driverId;
    if (priority) query.priority = priority;

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('assignedDriver', 'name phone')
        .populate('assignedVehicle', 'name plateNumber')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
    ]);

    return NextResponse.json({
      orders,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(session, ["admin", "dispatcher", "manager"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const customerInput =
      body?.customer && typeof body.customer === "object"
        ? (body.customer as Record<string, unknown>)
        : {};
    const pickupInput =
      body?.pickup && typeof body.pickup === "object"
        ? (body.pickup as Record<string, unknown>)
        : {};
    const deliveryInput =
      body?.delivery && typeof body.delivery === "object"
        ? (body.delivery as Record<string, unknown>)
        : {};

    const orderInput = pickFields(body, [
      "referenceNumber",
      "priority",
      "items",
      "notes",
    ]);

    const customer = pickFields(customerInput, ["name", "email", "phone"]);
    const pickup = pickFields(pickupInput, [
      "address",
      "city",
      "state",
      "zipCode",
      "scheduledTime",
    ]);
    const delivery = pickFields(deliveryInput, [
      "address",
      "city",
      "state",
      "zipCode",
      "scheduledTime",
    ]);

    if (!customer.name || !customer.phone) {
      return NextResponse.json(
        { error: "Customer name and phone are required" },
        { status: 400 }
      );
    }

    if (!pickup.address || !pickup.city || !pickup.state || !pickup.zipCode) {
      return NextResponse.json(
        { error: "Pickup address, city, state, and zip are required" },
        { status: 400 }
      );
    }

    if (!delivery.address || !delivery.city || !delivery.state || !delivery.zipCode) {
      return NextResponse.json(
        { error: "Delivery address, city, state, and zip are required" },
        { status: 400 }
      );
    }

    if (orderInput.items && !Array.isArray(orderInput.items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    if (Array.isArray(orderInput.items)) {
      orderInput.items = orderInput.items.map((item) => {
        const itemInput =
          item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        return pickFields(itemInput, [
          "description",
          "sku",
          "quantity",
          "dimensions",
          "weight",
          "status",
        ]);
      });

      const hasMissingDescription = (orderInput.items as Record<string, unknown>[])
        .some((item) => !item.description);
      if (hasMissingDescription) {
        return NextResponse.json(
          { error: "Each item must include a description" },
          { status: 400 }
        );
      }
    }

    const order = await Order.create({
      ...orderInput,
      customer,
      pickup,
      delivery,
      status: "pending",
      createdBy: session.user.id,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    const message = error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
