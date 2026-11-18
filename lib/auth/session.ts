import { createRemoteJWKSet, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "time4work_session";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
};

export type VerifiedSession = {
  user: AuthenticatedUser;
  expiresAt?: number;
};

export function isSameOriginRequest(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return fetchSite === "same-origin";

  const requestUrl = new URL(request.url);
  const allowedOrigins = new Set([requestUrl.origin]);
  const protocol = (request.headers.get("x-forwarded-proto") || requestUrl.protocol.slice(0, -1))
    .split(",")[0]
    .trim();
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (host) {
    for (const forwardedHost of host.split(",")) {
      allowedOrigins.add(`${protocol}://${forwardedHost.trim()}`);
    }
  }

  return allowedOrigins.has(origin);
}

let remoteKeys: ReturnType<typeof createRemoteJWKSet> | null = null;

function getRemoteKeys() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL is not configured");
  if (!remoteKeys) {
    remoteKeys = createRemoteJWKSet(
      new URL(`${baseUrl.replace(/\/$/, "")}/.well-known/jwks.json`),
    );
  }
  return remoteKeys;
}

export async function verifyNeonAuthToken(token: string): Promise<VerifiedSession | null> {
  if (!token || token.length > 8192) return null;

  try {
    const { payload } = await jwtVerify(token, getRemoteKeys(), {
      algorithms: ["EdDSA"],
    });
    if (typeof payload.sub !== "string" || !payload.sub || payload.sub.length > 200) {
      return null;
    }

    return {
      user: {
        id: payload.sub,
        email: typeof payload.email === "string" ? payload.email.slice(0, 254) : "",
        name: typeof payload.name === "string" ? payload.name.slice(0, 120) : "",
      },
      expiresAt: payload.exp,
    };
  } catch {
    return null;
  }
}
