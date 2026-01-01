import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed, pickFields } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

// GET single order
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const order = await Order.findById(id)
      .populate('assignedDriver', 'name phone email')
      .populate('assignedVehicle', 'name plateNumber type')
      .populate('createdBy', 'name email')
      .lean();

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PUT update order
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(session, ["admin", "dispatcher", "manager"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;
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

    const updates = pickFields(body, [
      "referenceNumber",
      "priority",
      "notes",
    ]);

    const customer = pickFields(customerInput, ["name", "email", "phone"]);
    const pickup = pickFields(pickupInput, [
      "address",
      "city",
      "state",
      "zipCode",
      "scheduledTime",
      "actualTime",
      "notes",
    ]);
    const delivery = pickFields(deliveryInput, [
      "address",
      "city",
      "state",
      "zipCode",
      "scheduledTime",
      "actualTime",
      "notes",
    ]);

    if (Object.keys(customer).length) {
      updates.customer = customer;
    }
    if (Object.keys(pickup).length) {
      updates.pickup = pickup;
    }
    if (Object.keys(delivery).length) {
      updates.delivery = delivery;
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "name plateNumber");

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    const message = error instanceof Error ? error.message : "Failed to update order";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE order
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(session, ["admin", "manager"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const { id } = await params;

    const order = await Order.findByIdAndDelete(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}
