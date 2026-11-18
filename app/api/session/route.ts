import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest, SESSION_COOKIE_NAME, verifyNeonAuthToken } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cookieOptions(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
  const secure = process.env.NODE_ENV === "production" || forwardedProtocol === "https" || new URL(request.url).protocol === "https:";
  return {
    httpOnly: true,
    secure,
    sameSite: process.env.NODE_ENV === "development" && secure ? "none" as const : "lax" as const,
    path: "/",
  };
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const authorization = request.headers.get("authorization") || "";
  const match = /^Bearer ([\w.-]+)$/.exec(authorization);
  if (!match) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  const verified = await verifyNeonAuthToken(match[1]);
  if (!verified) return NextResponse.json({ error: "Your sign-in session is invalid or expired." }, { status: 401 });

  const response = NextResponse.json({ user: verified.user }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
  const options = cookieOptions(request);
  response.cookies.set(SESSION_COOKIE_NAME, match[1], {
    ...options,
    ...(verified.expiresAt ? { expires: new Date(verified.expiresAt * 1000) } : {}),
  });
  return response;
}

export async function DELETE(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  }

  const response = NextResponse.json({ signedOut: true }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions(request),
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}
