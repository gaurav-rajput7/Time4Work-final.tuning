"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { createTime4WorkAuthClient } from "@/lib/auth-client";
import type { AuthenticatedUser } from "@/lib/auth/session";

type CloudPayload = Record<string, unknown>;
type CloudBridge = {
  user: AuthenticatedUser;
  load: () => Promise<{ payload: CloudPayload | null; revision: number; updatedAt: string | null }>;
  save: (payload: CloudPayload, expectedRevision: number) => Promise<Response>;
  signOut: () => Promise<void>;
};
type AuthClient = ReturnType<typeof createTime4WorkAuthClient>;

declare global {
  interface Window {
    time4workAuth?: CloudBridge;
    time4workFlush?: () => Promise<void>;
  }
}

async function getNeonSession(client: AuthClient) {
  const result = await client.getSession();
  const data = result.data as { session?: { token?: string }; user?: AuthenticatedUser } | null;
  const token = data?.session?.token;
  if (!token || !data?.user?.id) throw new Error("Your session expired. Sign in again.");
  return { token, user: data.user };
}

export function AppShell({ authBaseUrl, initialUser }: { authBaseUrl: string; initialUser: AuthenticatedUser | null }) {
  const authClient = useMemo(
    () => authBaseUrl ? createTime4WorkAuthClient(authBaseUrl) : null,
    [authBaseUrl],
  );
  const [user, setUser] = useState<AuthenticatedUser | null>(initialUser);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);

  useEffect(() => {
    if (!user) {
      delete window.time4workAuth;
      setBridgeReady(false);
      return;
    }

    const bridge: CloudBridge = {
      user,
      async load() {
        const response = await fetch("/api/state", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load your synced data.");
        return response.json();
      },
      async save(payload, expectedRevision) {
        return fetch("/api/state", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({ payload, expectedRevision }),
        });
      },
      async signOut() {
        await signOutUser();
      },
    };

    window.time4workAuth = bridge;
    setBridgeReady(true);
    return () => {
      if (window.time4workAuth === bridge) delete window.time4workAuth;
    };
  }, [user, authClient]);

  async function signOutUser() {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[title="Time4Work workspace"]');
    try {
      await frame?.contentWindow?.time4workFlush?.();
    } catch {
      setMessage("Some recent changes could not be synced. Stay signed in and try again.");
      return;
    }

    try {
      const response = await fetch("/api/session", { method: "DELETE", cache: "no-store" });
      if (!response.ok) throw new Error("Sign-out failed");
      if (authClient) await authClient.signOut().catch(() => undefined);
      setUser(null);
    } catch {
      setMessage("Sign out failed. Please try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (!authClient) {
      setMessage("Secure sign-in is not configured for this deployment.");
      return;
    }
    setBusy(true);

    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ email: email.trim().toLowerCase(), password, name: name.trim() })
        : await authClient.signIn.email({ email: email.trim().toLowerCase(), password });
      if (result.error) throw new Error("Sign-in failed");
      const session = await getNeonSession(authClient);
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Session verification failed");
      setUser(session.user);
    } catch {
      setMessage("We couldn’t complete sign-in. Check your details and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!authBaseUrl && !user) {
    return (
      <main className="auth-shell">
        <section className="auth-card" role="alert">
          <h1>Secure sign-in is unavailable</h1>
          <p className="auth-copy">The Neon Auth endpoint is not configured for this deployment.</p>
        </section>
      </main>
    );
  }

  if (user) {
    return (
      <main className="workspace">
        <header className="workspace-bar">
          <span className="workspace-user">Time4Work · {user.email}</span>
          <div className="workspace-actions">
            <span className="sync-status" role="status">Private cloud sync enabled</span>
            <button className="signout" type="button" onClick={() => void signOutUser()}>Sign out</button>
          </div>
        </header>
        {bridgeReady ? <iframe title="Time4Work workspace" src="/index.html" /> : <div className="auth-shell"><section className="auth-card loading-card">Preparing your workspace…</section></div>}
      </main>
    );
  }

  const signingUp = mode === "sign-up";
  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">T</div>
          <div><p className="brand-name">Time4Work</p><p className="brand-kicker">A calmer way to make progress</p></div>
        </div>
        <h1 id="auth-title">{signingUp ? "Create your account" : "Welcome back"}</h1>
        <p className="auth-copy">Your plans, focus sessions, and reminders stay in sync across your devices.</p>
        <form className="auth-form" onSubmit={submit}>
          {signingUp && <label>Name<input autoComplete="name" maxLength={120} value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={signingUp ? "new-password" : "current-password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}</button>
        </form>
        <p className="auth-message" role="alert">{message}</p>
        <button className="auth-switch" type="button" onClick={() => { setMode(signingUp ? "sign-in" : "sign-up"); setMessage(""); }}>
          {signingUp ? "Already have an account? Sign in" : "New to Time4Work? Create an account"}
        </button>
        <div className="sync-note"><span className="sync-dot" aria-hidden="true" />Secure sign-in · Private, account-scoped sync</div>
      </section>
    </main>
  );
}
