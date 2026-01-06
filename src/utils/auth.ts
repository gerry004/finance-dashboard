import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get("dashboard_auth");
  return authCookie?.value === "authenticated";
}

/**
 * Middleware function to protect API routes with authentication
 * Returns null if authenticated, or a NextResponse with 401 if not
 */
export async function requireAuth(): Promise<NextResponse | null> {
  const authenticated = await checkAuth();
  if (!authenticated) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  return null;
}

