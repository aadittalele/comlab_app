import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongoose";
import User from "@/lib/models/User";
import { hashPassword } from "@/lib/password";
import { signupSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const result = signupSchema.safeParse(body);
    if (!result.success) {
      const flattened = result.error.flatten();
      const fieldMessages = Object.values(flattened.fieldErrors)
        .flat()
        .filter(Boolean);
      const messages = [...flattened.formErrors, ...fieldMessages];
      const message = messages.length ? messages.join(". ") : "Invalid input";

      return NextResponse.json(
        { error: message, details: flattened },
        { status: 400 }
      );
    }

    const { email, password, firstName, lastName } = result.data;

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
    });

    // Return user data (without password hash)
    return NextResponse.json(
      {
        user: {
          id: user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
