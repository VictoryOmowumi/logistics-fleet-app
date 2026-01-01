import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

type MaintenanceStatus = "completed" | "scheduled" | "overdue";

export async function POST(request: NextRequest, { params }: Params) {
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
    const body = await request.json();
    const { title, performedAt, status, notes, nextServiceDue } = body as {
      title?: string;
      performedAt?: string;
      status?: MaintenanceStatus;
      notes?: string;
      nextServiceDue?: string;
    };

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    if (status && !["completed", "scheduled", "overdue"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (performedAt && Number.isNaN(Date.parse(performedAt))) {
      return NextResponse.json({ error: "Invalid performedAt date" }, { status: 400 });
    }

    if (nextServiceDue && Number.isNaN(Date.parse(nextServiceDue))) {
      return NextResponse.json({ error: "Invalid nextServiceDue date" }, { status: 400 });
    }

    const entry = {
      title: title.trim(),
      performedAt: performedAt ? new Date(performedAt) : undefined,
      status,
      notes,
    };

    const setOps: Record<string, unknown> = {};
    if (nextServiceDue) {
      setOps.nextServiceDue = new Date(nextServiceDue);
    }

    const updateOps: Record<string, unknown> = {
      $push: { maintenanceHistory: entry },
    };

    if (Object.keys(setOps).length) {
      updateOps.$set = setOps;
    }

    const updated = await Vehicle.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating maintenance history:", error);
    const message = error instanceof Error ? error.message : "Failed to update maintenance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
