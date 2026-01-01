"use client";

import { useState } from "react";
import Link from "next/link";

export default function RequestResetPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setStatus("success");
      setMessage(data.message || "Check your email for reset instructions.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Request failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card/80 p-8 shadow-xl">
        <h1 className="text-2xl font-semibold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email and we will send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
              required
            />
          </div>
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full rounded-2xl bg-foreground px-4 py-3 text-background font-semibold shadow-lg shadow-black/10 disabled:opacity-60"
          >
            {status === "loading" ? "Sending..." : "Send reset link"}
          </button>
        </form>

        {message ? (
          <div className="mt-4 rounded-xl border border-border bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/auth/login" className="text-primary font-semibold hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
