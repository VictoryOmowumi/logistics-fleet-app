import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`request-reset:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many reset requests. Try again later." },
        { status: 429 }
      );
    }

    await dbConnect();
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      const { token, tokenHash, expires } = createToken(60 * 60 * 1000);
      user.passwordResetToken = tokenHash;
      user.passwordResetExpires = expires;
      await user.save();

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
      const resetUrl = `${baseUrl}/auth/reset?token=${token}`;

      await sendEmail({
        to: user.email,
        subject: "Reset your password",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    }

    return NextResponse.json({
      message: "If an account exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    const message = error instanceof Error ? error.message : "Failed to request reset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
