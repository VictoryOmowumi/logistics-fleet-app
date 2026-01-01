import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { hashToken } from "@/lib/tokens";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`verify:${ip}`, { windowMs: 15 * 60 * 1000, max: 10 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Try again later." },
        { status: 429 }
      );
    }

    await dbConnect();
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const tokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    }).select("+emailVerificationToken +emailVerificationExpires");

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    }

    user.emailVerifiedAt = new Date();
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return NextResponse.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    const message = error instanceof Error ? error.message : "Failed to verify email";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
