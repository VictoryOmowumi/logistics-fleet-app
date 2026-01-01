import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Vehicle from "@/models/Vehicle";
import { isRoleAllowed, pickFields } from "@/lib/api/utils";

// GET all vehicles
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const [vehicles, total] = await Promise.all([
      Vehicle.find(query)
        .populate('assignedDriver', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Vehicle.countDocuments(query),
    ]);

    return NextResponse.json({
      vehicles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch vehicles" },
      { status: 500 }
    );
  }
}

// POST create new vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isRoleAllowed(session, ["admin", "manager"])) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    const body = await request.json();
    const vehicleInput = pickFields(body, [
      "name",
      "plateNumber",
      "type",
      "capacity",
      "fuelType",
      "vin",
      "make",
      "model",
      "year",
      "color",
      "lastServiceDate",
      "nextServiceDue",
    ]);

    if (!vehicleInput.name || !vehicleInput.plateNumber || !vehicleInput.type) {
      return NextResponse.json(
        { error: "Name, plate number, and type are required" },
        { status: 400 }
      );
    }

    if (!vehicleInput.capacity) {
      return NextResponse.json(
        { error: "Capacity is required" },
        { status: 400 }
      );
    }

    const vehicle = await Vehicle.create(vehicleInput);

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    
    // Check for duplicate key error
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: "Vehicle with this plate number already exists" },
        { status: 400 }
      );
    }
    
    const message = error instanceof Error ? error.message : "Failed to create vehicle";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
