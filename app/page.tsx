import { cookies } from "next/headers";
import { AppShell } from "@/components/app-shell";
import { SESSION_COOKIE_NAME, verifyNeonAuthToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const verified = token ? await verifyNeonAuthToken(token) : null;

  return (
    <AppShell
      authBaseUrl={process.env.NEON_AUTH_BASE_URL ?? ""}
      initialUser={verified?.user ?? null}
    />
  );
}
