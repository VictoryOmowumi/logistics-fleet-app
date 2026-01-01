import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["assigned", "cancelled"],
  assigned: ["picked_up", "cancelled"],
  picked_up: ["in_transit", "cancelled"],
  in_transit: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

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
    const { status } = body as { status?: string };

    if (!status || typeof status !== "string") {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const knownStatuses = Object.keys(STATUS_TRANSITIONS);
    if (!knownStatuses.includes(status)) {
      return NextResponse.json({ error: "Unknown status" }, { status: 400 });
    }

    const order = await Order.findById(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const current = order.status;
    if (current === status) {
      return NextResponse.json(order);
    }

    const allowed = STATUS_TRANSITIONS[current] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${current} to ${status}` },
        { status: 400 }
      );
    }

    const actor = session.user?.name || session.user?.email || "system";

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        $set: { status },
        $push: {
          activityLog: {
            message: `Status changed to ${status}`,
            timestamp: new Date(),
            actor,
            type: "status",
          },
        },
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating order status:", error);
    const message = error instanceof Error ? error.message : "Failed to update status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
