"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { FleetService } from "@/lib/services/fleetService";
import type { Driver } from "@/types";

// shadcn ui
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

import {
  AlertTriangle,
  ArrowRight,
  PackageSearch,
  Truck,
  Users,
  MapPin,
} from "lucide-react";

type SummaryResponse = {
  metrics: {
    orders: {
      total: number;
      pending: number;
      inTransit: number;
      delivered: number;
      cancelled: number;
      unassigned: number;
      highPriority: number;
    };
    drivers: {
      total: number;
      active: number;
      onBreak: number;
      offDuty: number;
      inactive: number;
    };
    vehicles: {
      total: number;
      available: number;
      inUse: number;
      maintenance: number;
      retired: number;
    };
  };
  orderTrend: { date: string; label: string; count: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    priority?: string;
    customer?: string;
    dropoff?: string;
    pickup?: string;
    createdAt?: string;
  }[];
  alerts: string[];
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

const MiniSparkline = ({ points }: { points: number[] }) => {
  const max = Math.max(...points, 1);
  const coords = points
    .map((v, i) => {
      const x = (i / Math.max(points.length - 1, 1)) * 100;
      const y = 40 - (v / max) * 40;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="h-12 w-full">
      <polyline
        points={coords}
        fill="none"
        stroke="url(#grad)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-brand-vivid, #6366f1)" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
};

const CompactMap = dynamic(() => import("@/components/map/DispatchMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl border border-border bg-muted/10">
      <Skeleton className="h-full w-full rounded-2xl" />
    </div>
  ),
});

export default function DashboardPage() {
  const router = useRouter();

  const {
    data: summary,
    error: summaryError,
    isLoading,
  } = useSWR<SummaryResponse>("/api/summary", fetcher, {
    refreshInterval: 15000,
  });

  const { data: drivers } = useSWR<Driver[]>(
    "dashboard:drivers",
    () => FleetService.getDrivers(),
    {
      refreshInterval: 15000,
    }
  );

  const orderTrendPoints = useMemo(
    () => summary?.orderTrend?.map((d) => d.count) ?? [0, 0, 0, 0, 0, 0, 0],
    [summary]
  );
  const alerts = summary?.alerts ?? [];

  const opsPulse = {
    activeOrders:
      (summary?.metrics.orders.pending ?? 0) +
      (summary?.metrics.orders.inTransit ?? 0),
    driversOnline: summary?.metrics.drivers.active ?? 0,
    vehiclesReady: summary?.metrics.vehicles.available ?? 0,
  };

  const showSkeleton = isLoading && !summary;

  return (
    <AppShell>
      <section className="space-y-6 pb-10">
        {/* hero overview */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card/90 shadow-sm">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(255,106,26,0.22),rgba(34,211,238,0.12))]" />
          <div className="relative grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    Ops overview
                  </div>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                    Fleet control center
                  </h1>
                  <p className="max-w-xl text-sm text-muted-foreground">
                    Monitor dispatch flow, driver availability, and vehicle readiness in one command surface.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1" asChild>
                    <Link href="/dispatch">
                      Open Dispatch Console
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" asChild>
                    <Link href="/orders">
                      View all orders
                      <PackageSearch className="h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <HeroStat
                  label="Active orders"
                  icon={PackageSearch}
                  value={opsPulse.activeOrders}
                  accent="from-primary/60 to-amber-400"
                  compact
                />
                <HeroStat
                  label="Drivers online"
                  icon={Users}
                  value={opsPulse.driversOnline}
                  accent="from-secondary/60 to-cyan-400"
                  compact
                />
                <HeroStat
                  label="Vehicles ready"
                  icon={Truck}
                  value={opsPulse.vehiclesReady}
                  accent="from-primary/50 to-orange-500"
                  compact
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background/60 p-4 shadow-sm">
              <div className="space-y-1 pb-2">
                <h2 className="text-sm font-semibold text-foreground">Ops pulse</h2>
                <p className="text-xs text-muted-foreground">
                  Last 7 days order flow and high priority volume.
                </p>
              </div>
              <div className="space-y-4">
                <MiniSparkline points={orderTrendPoints} />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Total orders</p>
                    <p className="text-lg font-semibold">{summary?.metrics.orders.total ?? "--"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">High priority</p>
                    <p className="text-lg font-semibold">{summary?.metrics.orders.highPriority ?? "--"}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold">{summary?.metrics.orders.pending ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
                    <p className="text-[11px] text-muted-foreground">In transit</p>
                    <p className="text-lg font-semibold">{summary?.metrics.orders.inTransit ?? 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        
        {summaryError && (
          <Alert variant="destructive" className="border border-destructive/30">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load overview</AlertTitle>
            <AlertDescription>
              We couldn&apos;t load the latest operations summary. Historical
              data is safe - try refreshing or checking your network.
            </AlertDescription>
          </Alert>
        )}

        {/* MAIN GRID */}
        {showSkeleton ? (
          <SkeletonGrid />
        ) : (
          <div className="rounded-3xl border border-border bg-background/60 p-6 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Live fleet map
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Real-time driver locations and activity.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {drivers?.length ?? 0} drivers online
                    </Badge>
                  </div>
                  <div className="h-90 rounded-2xl border border-border bg-muted/20 p-0">
                    <CompactMap drivers={drivers ?? []} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Recent shipments
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        Last 5 orders.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[11px]">
                      {summary?.recentOrders?.length ?? 0} total
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/70">
                    {(summary?.recentOrders ?? []).length === 0 ? (
                      <p className="px-4 py-3 text-sm text-muted-foreground">
                        No recent orders.
                      </p>
                    ) : (
                      <ScrollArea className="h-52">
                        <div className="divide-y divide-border">
                          {(summary?.recentOrders ?? []).map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={() => router.push(`/orders/${o.id}`)}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs transition hover:bg-muted/30"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[11px] font-semibold text-foreground">
                                    {o.orderNumber}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="rounded-full border-border bg-white/60 text-[10px] capitalize"
                                  >
                                    {o.status}
                                  </Badge>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  {o.customer ?? "--"}
                                </p>
                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {o.dropoff ?? "--"}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground">
                                <span className="uppercase tracking-[0.2em]">
                                  {o.priority ?? "normal"}
                                </span>
                                {o.createdAt && (
                                  <span>
                                    {new Date(o.createdAt).toLocaleTimeString(
                                      undefined,
                                      { hour: "2-digit", minute: "2-digit" }
                                    )}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <div className="space-y-1 pb-3">
                    <h2 className="text-sm font-semibold text-foreground">
                      System health
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      High-level service reliability snapshot.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <HealthStat
                      label="On-time"
                      value={calcPct(
                        summary?.metrics.orders.delivered,
                        summary?.metrics.orders.total
                      )}
                      tone="positive"
                    />
                    <HealthStat
                      label="Capacity"
                      value={calcPct(
                        summary?.metrics.vehicles.inUse,
                        summary?.metrics.vehicles.total
                      )}
                      tone="warn"
                    />
                    <HealthStat
                      label="Utilization"
                      value={calcPct(
                        summary?.metrics.drivers.active,
                        summary?.metrics.drivers.total
                      )}
                      tone="info"
                    />
                    <HealthStat
                      label="At risk"
                      value={calcPct(
                        summary?.metrics.orders.highPriority,
                        summary?.metrics.orders.total
                      )}
                      tone="alert"
                    />
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-2xl border border-border bg-background/70 p-4">
                  <div className="pointer-events-none absolute top-0 h-1 w-full bg-[linear-gradient(90deg,rgba(255,106,26,0.8),rgba(34,211,238,0.5))]" />
                  <div className="flex items-center justify-between gap-3 pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">
                        Alerts &amp; signals
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {alerts.length} open
                      </p>
                    </div>
                  </div>
                  {alerts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      All clear. Nothing needs attention right now.
                    </p>
                  ) : (
                    <ScrollArea className="h-50 pr-1">
                      <ul className="space-y-2">
                        {alerts.map((alert, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2 text-sm"
                          >
                            <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                            <span className="flex-1 text-foreground">
                              {alert}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] border-primary/40 bg-primary/10 text-primary"
                            >
                              needs review
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}

/* --- small UI helpers --- */
function HeroStat({
  label,
  value,
  icon: Icon,
  accent,
  compact,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  accent: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-linear-to-tr ${accent} opacity-25`}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p
            className={`font-semibold text-foreground ${
              compact ? "text-xl" : "text-2xl"
            }`}
          >
            {Number.isFinite(value) ? value : "--"}
          </p>
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}

function HealthStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "positive" | "warn" | "info" | "alert";
}) {
  const palette: Record<typeof tone, string> = {
    positive: "text-emerald-500",
    warn: "text-amber-500",
    info: "text-sky-500",
    alert: "text-rose-500",
  };
  return (
    <div className="rounded-xl border border-border bg-muted/10 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${palette[tone]}`}>{value}</p>
    </div>
  );
}

function calcPct(part?: number, total?: number) {
  if (!part || !total || total === 0) return "--";
  return `${Math.round((part / total) * 100)}%`;
}

function SkeletonGrid() {
  return (
    <div className="rounded-3xl border border-border bg-card/80 p-6 shadow-sm">
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Skeleton className="h-72 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-52 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
