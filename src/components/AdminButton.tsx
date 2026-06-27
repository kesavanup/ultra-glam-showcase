import { Link } from "@tanstack/react-router";
import { Settings } from "lucide-react";

export function AdminButton() {
  return (
    <Link
      to="/admin"
      aria-label="Admin"
      title="Admin"
      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/30 text-white/70 backdrop-blur transition hover:border-white/60 hover:text-white"
    >
      <Settings className="h-4 w-4" />
    </Link>
  );
}

export default AdminButton;
