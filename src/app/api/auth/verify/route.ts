import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const { passcode } = await request.json();
    const correctPasscode = process.env.DASHBOARD_PASSCODE;

    if (!correctPasscode) {
      return NextResponse.json(
        { error: "Passcode not configured on server" },
        { status: 500 }
      );
    }

    if (passcode === correctPasscode) {
      // Set a session cookie that expires when browser closes
      const cookieStore = await cookies();
      cookieStore.set("dashboard_auth", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        // No maxAge - this makes it a session cookie that expires when browser closes
      });

      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json(
        { error: "Invalid passcode" },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error("Error verifying passcode:", error);
    return NextResponse.json(
      { error: "Failed to verify passcode" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check if user is authenticated
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("dashboard_auth");

  return NextResponse.json({
    authenticated: authCookie?.value === "authenticated",
  });
}

