import { and, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest, SESSION_COOKIE_NAME, verifyNeonAuthToken } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { time4workUserState, type Time4WorkState } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STATE_BYTES = 1_000_000;

function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" },
  });
}

async function userIdFromRequest(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const verified = await verifyNeonAuthToken(token);
  return verified?.user.id ?? null;
}

async function readState(userId: string) {
  const [row] = await db
    .select({ payload: time4workUserState.payload, revision: time4workUserState.revision, updatedAt: time4workUserState.updatedAt })
    .from(time4workUserState)
    .where(eq(time4workUserState.userId, userId))
    .limit(1);

  return row ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await userIdFromRequest(request);
  if (!userId) return noStoreJson({ error: "Sign in to sync your data." }, 401);

  const state = await readState(userId);
  return noStoreJson({
    payload: state?.payload ?? null,
    revision: state?.revision ?? 0,
    updatedAt: state?.updatedAt?.toISOString() ?? null,
  });
}

export async function PUT(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return noStoreJson({ error: "Invalid origin." }, 403);
  }
  const userId = await userIdFromRequest(request);
  if (!userId) return noStoreJson({ error: "Sign in to sync your data." }, 401);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_STATE_BYTES) {
    return noStoreJson({ error: "Your sync data is too large." }, 413);
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_STATE_BYTES) {
    return noStoreJson({ error: "Your sync data is too large." }, 413);
  }

  let body: { payload?: unknown; expectedRevision?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return noStoreJson({ error: "Invalid sync payload." }, 400);
  }

  if (
    !body ||
    typeof body !== "object" ||
    !body.payload ||
    typeof body.payload !== "object" ||
    Array.isArray(body.payload) ||
    !Number.isSafeInteger(body.expectedRevision) ||
    Number(body.expectedRevision) < 0
  ) {
    return noStoreJson({ error: "Invalid sync payload." }, 400);
  }

  const payload = body.payload as Time4WorkState;
  const expectedRevision = Number(body.expectedRevision);

  if (expectedRevision === 0) {
    const [inserted] = await db
      .insert(time4workUserState)
      .values({ userId, payload, revision: 1 })
      .onConflictDoNothing({ target: time4workUserState.userId })
      .returning({ revision: time4workUserState.revision, updatedAt: time4workUserState.updatedAt });

    if (inserted) {
      return noStoreJson({ revision: inserted.revision, updatedAt: inserted.updatedAt.toISOString() });
    }
  } else {
    const [updated] = await db
      .update(time4workUserState)
      .set({ payload, revision: expectedRevision + 1, updatedAt: new Date() })
      .where(
        and(
          eq(time4workUserState.userId, userId),
          eq(time4workUserState.revision, expectedRevision),
        ),
      )
      .returning({ revision: time4workUserState.revision, updatedAt: time4workUserState.updatedAt });

    if (updated) {
      return noStoreJson({ revision: updated.revision, updatedAt: updated.updatedAt.toISOString() });
    }
  }

  const latest = await readState(userId);
  return noStoreJson(
    {
      error: "A newer version was saved from another device.",
      conflict: true,
      payload: latest?.payload ?? null,
      revision: latest?.revision ?? 0,
      updatedAt: latest?.updatedAt?.toISOString() ?? null,
    },
    409,
  );
}
