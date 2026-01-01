import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await dbConnect();
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("health_check_failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
