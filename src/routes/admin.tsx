import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { checkAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · BLACK PIXAL" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const { unlocked } = await checkAdmin();
    if (!unlocked) throw redirect({ to: "/admin/login" });
  },
  component: () => <Outlet />,
});
