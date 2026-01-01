import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

type ActivityType = "status" | "event" | "note";

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
    const { message, type, actor } = body as {
      message?: string;
      type?: ActivityType;
      actor?: string;
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const safeType: ActivityType =
      type === "status" || type === "event" || type === "note" ? type : "note";
    const safeActor =
      actor && typeof actor === "string"
        ? actor
        : session.user?.name || session.user?.email || "system";

    const updated = await Order.findByIdAndUpdate(
      id,
      {
        $push: {
          activityLog: {
            message: message.trim(),
            timestamp: new Date(),
            actor: safeActor,
            type: safeType,
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
    console.error("Error appending activity log:", error);
    const message = error instanceof Error ? error.message : "Failed to add activity";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
