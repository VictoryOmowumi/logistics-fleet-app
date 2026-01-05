"use client";

import { useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
};

export default function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered") === "true";
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const friendlyError = useMemo(() => {
    if (error) return error;
    if (authError) {
      return ERROR_MESSAGES[authError] || "Unable to sign in. Please try again.";
    }
    return null;
  }, [error, authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        const message = ERROR_MESSAGES[result.error] || result.error || "Invalid credentials";
        setError(message);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,106,26,0.14),transparent_55%)]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        {/* Hero side */}
        <section className="bg-image relative hidden lg:flex flex-col justify-end gap-8 overflow-hidden p-12 text-white bg-white/10 backdrop-blur">
          <div className="pointer-events-none absolute -right-12 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(255,106,26,0.35),transparent_65%)] blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.25),transparent_65%)] blur-3xl" />
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs uppercase tracking-[0.3em]">
              Trusted Ops Stack
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Fleet login that feels
                <br />
                crafted, not corporate.
              </h1>
              <p className="text-white/70 max-w-xl text-sm leading-relaxed">
                Securely access dispatch, drivers, and fleet telemetry with zero friction. Single hub for ops leads, dispatchers, and managers.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Enterprise-grade auth</p>
              <p className="text-lg font-semibold">Encrypted, audited, role-aware</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.2em]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10 font-semibold">T</span>
              Truck&Co Ops
            </div>
          </div>
        </section>

        {/* Form side */}
        <section className="flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-md space-y-8 rounded-3xl border border-border bg-card/80 p-8 shadow-xl backdrop-blur">
            <div className="space-y-3">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white font-black text-2xl italic shadow-[0_12px_30px_rgba(255,106,26,0.35)]">
                T
              </div>
              <div>
                <h2 className="text-3xl font-semibold text-foreground">Sign in</h2>
                <p className="text-muted-foreground text-sm">Access the console to orchestrate fleets and orders.</p>
              </div>
            </div>

            {registered && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
                Account created. Check your email to verify, then sign in.
              </div>
            )}

            {friendlyError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
                {friendlyError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" aria-live="polite">
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

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="password" className="font-medium text-foreground">Password</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                    <Link href="/auth/request-reset" className="text-primary hover:underline">
                      Forgot?
                    </Link>
                  </div>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Enter your password"
                    required
                  />
                  <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-muted-foreground text-xs">
                    Secure
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-foreground px-4 py-3 text-background font-semibold shadow-lg shadow-black/10 hover:translate-y-px transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Signing you in..." : "Continue to dashboard"}
              </button>
            </form>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Need an account?</span>
              <Link href="/auth/register" className="text-primary font-semibold hover:underline">Create one</Link>
            </div>

            <div className="rounded-2xl border border-border bg-muted/60 px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Demo credentials</span>
                <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted-foreground border border-border">Sandbox</span>
              </div>
              <p className="mt-2 font-mono text-foreground">admin@truckco.com / password123</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
