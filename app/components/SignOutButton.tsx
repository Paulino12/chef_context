"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <Button
      variant="outline"
      className="cursor-pointer"
      onClick={() => signOut({ callbackUrl: "/" })} // send them back to home
    >
      Sign out
    </Button>
  );
}
