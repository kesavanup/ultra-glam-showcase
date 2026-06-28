// Server-only admin email allowlist check.
// Used inside server-function handlers that already ran `requireSupabaseAuth`.
export function assertAdminEmail(claims: { email?: string } | null | undefined): void {
  const allowed = (process.env.ADMIN_EMAIL ?? "").toLowerCase().trim();
  const email = (claims?.email ?? "").toLowerCase().trim();
  if (!allowed) throw new Error("ADMIN_EMAIL not configured");
  if (!email || email !== allowed) {
    throw new Response("Forbidden", { status: 403 });
  }
}
