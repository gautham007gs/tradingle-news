"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

/** Opens the shared AuthModal on mount so /login and /register deep links
 *  behave like the nav "Sign In" button instead of a dead stub page. */
export default function AutoOpenAuthModal() {
  const { openAuthModal } = useAuth();

  useEffect(() => {
    openAuthModal();
  }, [openAuthModal]);

  return null;
}
