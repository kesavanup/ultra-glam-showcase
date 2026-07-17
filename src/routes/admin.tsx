import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "").toLowerCase().trim();

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin · BLACK PIXAL" },
      { name: "robots", content: "noindex" },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email?.toLowerCase();
    if (!email) {
      throw redirect({ to: "/admin/login" });
    }
    // Server-side assertAdminEmail is the authoritative check; this client-side
    // gate is a UX guard only and is skipped when VITE_ADMIN_EMAIL is not set.
    if (ADMIN_EMAIL && email !== ADMIN_EMAIL) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
