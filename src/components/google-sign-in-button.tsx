"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth/client";

export function GoogleSignInButton({ locale, label }: { locale: string; label: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid gap-2">
      <button
        type="button"
        className="btn btn-ghost w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError(null);
          try {
            const origin = window.location.origin;
            const { error: authError } = await authClient.signIn.social({
              provider: "google",
              callbackURL: `${origin}/${locale}/account`,
              newUserCallbackURL: `${origin}/${locale}/account`,
              errorCallbackURL: `${origin}/${locale}/account/login?error=google`,
            });
            if (authError) {
              setError(authError.message || "Google sign-in failed");
              setPending(false);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : "Google sign-in failed");
            setPending(false);
          }
        }}
      >
        {pending ? "…" : label}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
