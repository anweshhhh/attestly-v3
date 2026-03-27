"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

type GoogleSignInButtonProps = {
  callbackUrl: string;
};

export function GoogleSignInButton({ callbackUrl }: GoogleSignInButtonProps) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      className="button-primary"
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        void signIn("google", { callbackUrl });
      }}
    >
      {isPending ? "Connecting to Google..." : "Continue with Google"}
    </button>
  );
}
