import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

interface ItemInput {
  description: string;
  sku?: string;
  quantity: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit?: "in" | "cm";
  };
  weight?: number;
  status?: "picked" | "packed" | "pending";
}

const INCHES_PER_CM = 0.3937008;
const CUBIC_INCHES_PER_CUBIC_FOOT = 1728;

function computeTotals(items: ItemInput[]) {
  let totalWeight: number | undefined;
  let totalVolume: number | undefined;

  for (const item of items) {
    const qty = Number(item.quantity) || 0;

    if (item.weight !== undefined && Number.isFinite(item.weight)) {
      totalWeight = (totalWeight || 0) + item.weight * qty;
    }

    const dims = item.dimensions;
    if (
      dims &&
      Number.isFinite(dims.length) &&
      Number.isFinite(dims.width) &&
      Number.isFinite(dims.height)
    ) {
      const unit = dims.unit || "in";
      const lengthIn = unit === "cm" ? dims.length * INCHES_PER_CM : dims.length;
      const widthIn = unit === "cm" ? dims.width * INCHES_PER_CM : dims.width;
      const heightIn = unit === "cm" ? dims.height * INCHES_PER_CM : dims.height;
      const volumeFt3 =
        (lengthIn * widthIn * heightIn) / CUBIC_INCHES_PER_CUBIC_FOOT;
      totalVolume = (totalVolume || 0) + volumeFt3 * qty;
    }
  }

  return { totalWeight, totalVolume };
}

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

    if (!Array.isArray(body?.items)) {
      return NextResponse.json({ error: "Items array is required" }, { status: 400 });
    }

    const items = body.items as ItemInput[];
    const normalized = items.map((item) => ({
      description: item.description,
      sku: item.sku,
      quantity: Number(item.quantity) || 0,
      dimensions: item.dimensions,
      weight: item.weight,
      status: item.status,
    }));

    if (
      normalized.some(
        (item) =>
          !item.description ||
          typeof item.description !== "string" ||
          item.quantity <= 0
      )
    ) {
      return NextResponse.json(
        { error: "Each item must include a description and quantity" },
        { status: 400 }
      );
    }

    const totals = computeTotals(normalized);
    const actor = session.user?.name || session.user?.email || "system";

    const setOps: Record<string, unknown> = { items: normalized };
    const unsetOps: Record<string, "" | 1> = {};

    if (totals.totalWeight !== undefined) {
      setOps.totalWeight = totals.totalWeight;
    } else {
      unsetOps.totalWeight = "";
    }

    if (totals.totalVolume !== undefined) {
      setOps.totalVolume = totals.totalVolume;
    } else {
      unsetOps.totalVolume = "";
    }

    const updateOps: Record<string, unknown> = {
      $set: setOps,
      $push: {
        activityLog: {
          message: "Manifest updated",
          timestamp: new Date(),
          actor,
          type: "event",
        },
      },
    };

    if (Object.keys(unsetOps).length) {
      updateOps.$unset = unsetOps;
    }

    const updated = await Order.findByIdAndUpdate(id, updateOps, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating order items:", error);
    const message = error instanceof Error ? error.message : "Failed to update items";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
