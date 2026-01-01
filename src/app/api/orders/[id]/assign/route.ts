import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
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

    const hasDriver = Object.prototype.hasOwnProperty.call(body, "driverId");
    const hasVehicle = Object.prototype.hasOwnProperty.call(body, "vehicleId");

    if (!hasDriver && !hasVehicle) {
      return NextResponse.json(
        { error: "driverId or vehicleId is required" },
        { status: 400 }
      );
    }

    const { driverId, vehicleId } = body as {
      driverId?: string | null;
      vehicleId?: string | null;
    };

    if (hasDriver && driverId !== null && typeof driverId !== "string") {
      return NextResponse.json({ error: "Invalid driverId" }, { status: 400 });
    }

    if (hasVehicle && vehicleId !== null && typeof vehicleId !== "string") {
      return NextResponse.json({ error: "Invalid vehicleId" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const activityLog: {
      message: string;
      timestamp: Date;
      actor?: string;
      type?: "status";
    }[] = [];
    const actor = session.user?.name || session.user?.email || "system";

    if (hasDriver) {
      updates.assignedDriver = driverId || null;
      activityLog.push({
        message: driverId ? "Driver assigned" : "Driver unassigned",
        timestamp: new Date(),
        actor,
        type: "status",
      });
      if (driverId && order.status === "pending") {
        updates.status = "assigned";
      }
      if (!driverId && order.status === "assigned") {
        updates.status = "pending";
      }
    }

    if (hasVehicle) {
      updates.assignedVehicle = vehicleId || null;
      activityLog.push({
        message: vehicleId ? "Vehicle assigned" : "Vehicle unassigned",
        timestamp: new Date(),
        actor,
        type: "status",
      });
    }

    const updateOps: Record<string, unknown> = { $set: updates };
    if (activityLog.length) {
      updateOps.$push = { activityLog: { $each: activityLog } };
    }

    const updated = await Order.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    })
      .populate("assignedDriver", "name phone")
      .populate("assignedVehicle", "name plateNumber");

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error assigning order:", error);
    const message = error instanceof Error ? error.message : "Failed to assign order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
