import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? "dot3up@gmail.com").toLowerCase();

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
    if (!email || email !== ADMIN_EMAIL) {
      throw redirect({ to: "/admin/login" });
    }
  },
  component: () => <Outlet />,
});
