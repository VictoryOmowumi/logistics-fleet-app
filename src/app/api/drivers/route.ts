import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Driver from "@/models/Driver";
import { isRoleAllowed, pickFields } from "@/lib/api/utils";
import "@/models/Vehicle";

// GET all drivers
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};
    if (status) {
      query.status = status;
    }

    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .populate('vehicle', 'name plateNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Driver.countDocuments(query),
    ]);

    return NextResponse.json({
      drivers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST create new driver
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
    const driverInput = pickFields(body, [
      "name",
      "email",
      "phone",
      "status",
      "employeeId",
      "employmentType",
      "vehicle",
      "licenseNumber",
      "licenseExpiry",
      "avatar",
    ]);

    if (!driverInput.name || !driverInput.email || !driverInput.phone) {
      return NextResponse.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    if (!driverInput.licenseNumber || !driverInput.licenseExpiry) {
      return NextResponse.json(
        { error: "License number and expiry are required" },
        { status: 400 }
      );
    }

    if (
      typeof driverInput.licenseExpiry === "string" &&
      Number.isNaN(Date.parse(driverInput.licenseExpiry))
    ) {
      return NextResponse.json(
        { error: "Invalid license expiry date" },
        { status: 400 }
      );
    }

    const driver = await Driver.create(driverInput);

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error("Error creating driver:", error);
    
    // Check for duplicate key error
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json(
        { error: "Driver with this email already exists" },
        { status: 400 }
      );
    }
    
    const message = error instanceof Error ? error.message : "Failed to create driver";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
