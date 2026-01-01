import { NextRequest, NextResponse } from 'next/server';
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { createToken } from "@/lib/tokens";
import { sendEmail } from "@/lib/email";
import { getClientIp, rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const limit = rateLimit(`register:${ip}`, { windowMs: 15 * 60 * 1000, max: 5 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Try again later." },
        { status: 429 }
      );
    }

    await dbConnect();

    const { name, email, password } = await request.json();

    // Validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create user
    const { token, tokenHash, expires } = createToken(24 * 60 * 60 * 1000);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: "dispatcher", // Default role
      emailVerifiedAt: null,
      emailVerificationToken: tokenHash,
      emailVerificationExpires: expires,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
    const verifyUrl = `${baseUrl}/auth/verify?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: "Verify your account",
      text: `Verify your account: ${verifyUrl}`,
      html: `<p>Verify your account:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
    });

    return NextResponse.json(
      {
        message: "User created successfully. Check your email to verify your account.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register user';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
