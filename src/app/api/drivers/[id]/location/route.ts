import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Driver from "@/models/Driver";
import { isRoleAllowed } from "@/lib/api/utils";

interface Params {
  params: Promise<{ id: string }>;
}

// PUT update driver location
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
    const { coordinates } = await request.json();

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return NextResponse.json(
        { error: "Invalid coordinates. Expected [longitude, latitude]" },
        { status: 400 }
      );
    }

    const driver = await Driver.findByIdAndUpdate(
      id,
      {
        $set: {
          location: {
            type: "Point",
            coordinates: coordinates,
          },
        },
      },
      { new: true }
    );

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Location updated successfully",
      location: driver.location,
    });
  } catch (error) {
    console.error("Error updating driver location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

// GET driver location
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { id } = await params;

    const driver = await Driver.findById(id).select('location name').lean();

    if (!driver) {
      return NextResponse.json({ error: "Driver not found" }, { status: 404 });
    }

    return NextResponse.json({
      driverId: id,
      name: driver.name,
      location: driver.location || null,
    });
  } catch (error) {
    console.error("Error fetching driver location:", error);
    return NextResponse.json(
      { error: "Failed to fetch location" },
      { status: 500 }
    );
  }
}
