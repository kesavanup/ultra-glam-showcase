// Server-only helpers for the shared-password admin gate.
import { useSession } from "@tanstack/react-start/server";
import { redirect } from "@tanstack/react-router";

export type AdminSession = { unlocked?: boolean };

export const adminSessionConfig = {
  password: process.env.SESSION_SECRET ?? "dev-only-insecure-fallback-32-chars__",
  name: "bp-admin",
  maxAge: 60 * 60 * 8, // 8h
  cookie: {
    httpOnly: true,
    secure: true,
    // "none" so the cookie is accepted inside the Lovable preview iframe (cross-site context).
    sameSite: "none" as const,
    path: "/",
  },
};

export async function getAdminSession() {
  return useSession<AdminSession>(adminSessionConfig);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.data.unlocked) throw redirect({ to: "/admin/login" });
  return session;
}
