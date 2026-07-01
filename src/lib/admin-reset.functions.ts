import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({ password: z.string().min(8).max(200) });

export const resetAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data }) => {
    const adminEmail = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
    if (!adminEmail) throw new Error("ADMIN_EMAIL not configured");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user by email
    let userId: string | null = null;
    let page = 1;
    while (!userId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw error;
      const found = list.users.find((u) => u.email?.toLowerCase() === adminEmail);
      if (found) { userId = found.id; break; }
      if (list.users.length < 200) break;
      page++;
    }

    if (userId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw error;
      return { ok: true, created: false };
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw error;
    return { ok: true, created: true };
  });
