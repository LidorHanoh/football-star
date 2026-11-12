"use client";

import { LogOutIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.refresh();
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label={label} title={label}>
      <LogOutIcon className="rtl:-scale-x-100" />
    </Button>
  );
}
