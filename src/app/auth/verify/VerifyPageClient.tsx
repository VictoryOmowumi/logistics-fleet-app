"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyPageClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Verification token is missing.");
      return;
    }

    const verify = async () => {
      setStatus("loading");
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Verification failed");
        }
        setStatus("success");
        setMessage("Email verified. You can now sign in.");
      } catch (err) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Verification failed");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold text-foreground">Verify your email</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {status === "loading" && "Verifying your account..."}
          {status === "idle" && "Preparing verification..."}
          {status === "success" && message}
          {status === "error" && message}
        </p>
        <div className="mt-6">
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-2xl bg-foreground px-4 py-2 text-sm font-semibold text-background"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
