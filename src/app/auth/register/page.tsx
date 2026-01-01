'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to register');
        return;
      }

      router.push('/auth/login?registered=true');
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-32 -top-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute right-0 top-10 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,106,26,0.14),_transparent_55%)]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        {/* Hero side */}
        <section className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white bg-[linear-gradient(140deg,_#0b0c0e_0%,_#0f1114_55%,_#141820_100%)]">
          <div className="pointer-events-none absolute -right-12 top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,106,26,0.35),_transparent_65%)] blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-10 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.25),_transparent_65%)] blur-3xl" />
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs uppercase tracking-[0.3em]">
              Create team access
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight">
                Bring dispatch, drivers,
                <br />
                and ops under one login.
              </h1>
              <p className="text-white/70 max-w-xl text-sm leading-relaxed">
                Provision accounts for managers and dispatchers with secure credential storage and role-aware access.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              {[{ label: 'Teams onboarded', value: '42' }, { label: 'Avg. setup time', value: '3m' }, { label: 'Regions covered', value: '11' }].map((item) => (
                <div key={item.label} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                  <div className="text-xs text-white/60">{item.label}</div>
                  <div className="text-2xl font-semibold mt-1">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur px-6 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Role-based access</p>
              <p className="text-lg font-semibold">Admins, managers, dispatchers</p>
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
                <h2 className="text-3xl font-semibold text-foreground">Create your account</h2>
                <p className="text-muted-foreground text-sm">Set up access for your fleet operations team.</p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" aria-live="polite">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">Full name</label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Alex Dispatch"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">Work email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="you@truckco.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <label htmlFor="password" className="font-medium text-foreground">Password</label>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Create a strong password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">Confirm password</label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-muted/60 px-4 py-3 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Re-enter your password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-foreground px-4 py-3 text-background font-semibold shadow-lg shadow-black/10 hover:translate-y-px transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Already using Truck&Co?</span>
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
