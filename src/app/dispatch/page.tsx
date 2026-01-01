"use client";

import { useMemo, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { OrderService } from "@/lib/services/orderService";
import { FleetService } from "@/lib/services/fleetService";
import type { Order as BaseOrder, Driver } from "@/types";

import { cn } from "@/lib/utils";

// shadcn/ui
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import {
  AlertTriangle,
  Route,
  User2,
  Truck,
  Clock,
  Search,
  SlidersHorizontal,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from "lucide-react";

/**
 * Dynamic map: Leaflet needs window, so no SSR.
 * NOTE: we'll pass selectedDriverId + onDriverClick so cards and map interact.
 */
const DispatchMap = dynamic(
  () => import("@/components/map/DispatchMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-3xl border border-border bg-muted/10 text-xs text-muted-foreground">
        Initializing map...
      </div>
    ),
  }
);

// Extend your base Order type with the "UI-only" fields we show on cards.
type UIOrder = BaseOrder & {
  internal_id?: string;
  customer?: string;
  customer_phone?: string;
  driverId?: string | null;
  priority?: "low" | "medium" | "high";
  zone?: string;
  totalWeightKg?: number;
  totalPallets?: number;
  etaMinutes?: number;
};

const fetchOrders = () =>
  OrderService.getOrders() as Promise<UIOrder[]>;

const fetchDrivers = () =>
  FleetService.getDrivers() as Promise<Driver[]>;

export default function DispatchConsolePage() {
  const [selectedOrder, setSelectedOrder] = useState<UIOrder | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignMessage, setAssignMessage] = useState<string | null>(null);

  useEffect(() => {
    setAssignMessage(null);
  }, [selectedOrder?.id]);

  // Live orders
  const {
    data: activeOrders,
    isLoading: ordersLoading,
    error: ordersError,
  } = useSWR<UIOrder[]>("orders:active", fetchOrders, {
    refreshInterval: 5000,
  });

  // Live drivers
  const {
    data: driversData,
    error: driversError,
  } = useSWR<Driver[]>("drivers", fetchDrivers, {
    refreshInterval: 10000,
  });

  const orders: UIOrder[] = useMemo(
    () =>
      (activeOrders ?? []).filter((o) =>
        ["pending", "assigned", "picked_up", "in_transit"].includes(
          String(o.status)
        )
      ),
    [activeOrders]
  );

  const drivers: Driver[] = useMemo(() => driversData ?? [], [driversData]);

  const loading = ordersLoading && !activeOrders;
  const hasError = !!ordersError;
  const pendingCount = orders.length;
  const urgentCount = orders.filter((order) => order.priority === "high").length;

  // When we click "Assign driver", wire to your API here later
  async function handleAssignDriver(): Promise<void> {
    if (!selectedOrder || !selectedDriverId) return;
    setAssigning(true);
    setAssignMessage(null);

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ driverId: selectedDriverId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to assign driver");
      }

      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              driver_id: selectedDriverId,
              status: prev.status === "pending" ? "assigned" : prev.status,
            }
          : prev
      );
      setAssignMessage("Driver assigned.");
    } catch (err) {
      setAssignMessage(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <AppShell>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border bg-card/80 px-6 py-5 shadow-sm">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Dispatch console
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Live order assignment
            </h1>
            <p className="text-sm text-muted-foreground">
              Match urgent orders to available drivers and keep routes moving.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1" asChild>
              <Link href="/orders">
                View all orders
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="gap-1" asChild>
              <Link href="/drivers">
                Manage drivers
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <div className="rounded-full border border-border bg-muted/50 px-3 py-1">
            {pendingCount} active orders
          </div>
          <div className="rounded-full border border-border bg-muted/50 px-3 py-1">
            {urgentCount} high priority
          </div>
          <div className="rounded-full border border-border bg-muted/50 px-3 py-1">
            {drivers.length} drivers online
          </div>
        </div>
      </section>
      {/* Full-height dark console feel */}
      <section className="flex min-h-[calc(100vh-5rem)] flex-col gap-6 pb-10 xl:flex-row">
        {/* LEFT: Unassigned Queue (LogiFleet style) */}
        <aside className="flex w-full max-w-md flex-col rounded-3xl border border-border bg-card/80 shadow-sm xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)]">
          <div className="border-b border-border px-5 py-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                Unassigned queue
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                  {pendingCount}
                </span>
              </h2>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/40 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-colors">
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Search + chips row */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  className="h-10 w-full rounded-2xl border border-border bg-muted/60 px-9 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Search orders..."
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-3 text-[11px] font-semibold text-primary hover:bg-primary/25 transition-colors">
                  Urgency: High
                  <span className="text-[13px]">x</span>
                </button>
                <button className="flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 text-[11px] font-medium text-foreground hover:bg-muted transition-colors">
                  Zone: All
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 bg-background">
            <ScrollArea className="h-[calc(100vh-12rem)] px-4 pb-4 pt-3">
              {/* Error */}
              {hasError && (
                <Alert
                  variant="destructive"
                  className="mb-3 border-destructive/40"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Failed to load orders</AlertTitle>
                  <AlertDescription className="text-xs">
                    Check your connection or refresh. Live data will resume once
                    we reconnect.
                  </AlertDescription>
                </Alert>
              )}

              {/* Loading skeleton */}
              {loading && (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </div>
              )}

              {/* Empty state */}
              {!loading && !hasError && orders.length === 0 && (
                <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
                    !
                  </div>
                  <p className="font-medium text-foreground">
                    All caught up
                  </p>
                  <p className="text-xs">
                    No active orders waiting for dispatch.
                  </p>
                </div>
              )}

              {/* Orders list (LogiFleet-style cards) */}
              <div className="space-y-3">
                {orders.map((order) => {
                  const isSelected = selectedOrder?.id === order.id;

                  const urgency =
                    order.priority === "high"
                      ? "High"
                      : order.priority === "medium"
                      ? "Medium"
                      : order.priority === "low"
                      ? "Low"
                      : null;

                  const weight =
                    order.totalWeightKg != null
                      ? `${order.totalWeightKg}kg`
                      : null;

                  const pallets =
                    order.totalPallets != null ? `${order.totalPallets} plts` : null;

                  const eta =
                    order.etaMinutes != null
                      ? `Due in ${order.etaMinutes}m`
                      : null;

                  return (
                    <button
                      key={order.id}
                      type="button"
                      onClick={() => {
                        setSelectedOrder(order);
                        setSelectedDriverId(order.driver_id ?? null);
                      }}
                  className={cn(
                        "group relative flex w-full flex-col gap-3 rounded-2xl border border-border bg-background/70 p-4 text-left text-xs transition-all hover:-translate-y-0.2 hover:border-primary/70 hover:shadow",
                        isSelected &&
                          "border-primary bg-primary/10 shadow-sm"
                      )}
                    >
                      {/* Top row - ID + urgency */}
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {order.internal_id ?? order.id}
                            </span>
                            {urgency && (
                              <span
                                className={cn(
                                  "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                                  urgency === "High" &&
                                    "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300",
                                  urgency === "Medium" &&
                                    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300",
                                  urgency === "Low" &&
                                    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                )}
                              >
                                {urgency}
                              </span>
                            )}
                          </div>
                          {eta && (
                            <span className="mt-1 flex w-fit items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-300">
                              <Clock className="h-3 w-3" />
                              {eta}
                            </span>
                          )}
                        </div>

                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/60 text-muted-foreground group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                          {/* drag icon-ish */}
                          <SlidersHorizontal className="h-3.5 w-3.5 rotate-90" />
                        </div>
                      </div>

                      {/* Pickup / Dropoff */}
                      <div className="flex flex-col gap-3 border-t border-dashed border-border/60 pt-2">
                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground ring-2 ring-background" />
                          <div>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                              Pickup
                            </p>
                            <p className="text-sm font-medium leading-tight text-foreground">
                              {order.pickup}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary ring-2 ring-background" />
                          <div>
                            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                              Dropoff
                            </p>
                            <p className="text-sm font-medium leading-tight text-foreground">
                              {order.dropoff}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Meta row: weight / pallets */}
                      <div className="flex items-center gap-3 pt-1">
                        {weight && (
                          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            <Truck className="h-3.5 w-3.5" />
                            {weight}
                          </span>
                        )}
                        {pallets && (
                          <span className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                            {pallets}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </aside>

        {/* RIGHT: Map side (LogiFleet-style) */}
        <div className="flex flex-1 flex-col gap-4">
          <Card className="flex h-full flex-col rounded-3xl border border-border bg-card/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm">Dispatch map</CardTitle>
                <CardDescription>
                  Real-time driver locations and activity.
                </CardDescription>
              </div>

              {driversError ? (
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 border-rose-500/40 bg-rose-500/10 text-[11px] text-rose-600 dark:text-rose-300"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  Offline
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="flex items-center gap-2 border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-300"
                >
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  {drivers.length} drivers online
                </Badge>
              )}
            </CardHeader>

            <CardContent className="relative flex-1 min-h-90 overflow-hidden rounded-3xl border border-border bg-muted/10 p-0">
              {/* Actual map */}
              <DispatchMap
                drivers={drivers}
                selectedDriverId={selectedDriverId}
                onDriverClick={(driverId) => {
                  setSelectedDriverId(driverId);

                  // If there's an order already assigned to this driver, highlight it
                  const match = orders.find((o) => o.driver_id === driverId);
                  if (match) setSelectedOrder(match);
                }}
              />

              {/* LogiFleet-style overlays (filters + zoom controls) */}
              {/* Driver filters top-left */}
              <div className="pointer-events-none absolute left-12 top-4 z-20 flex flex-col gap-2">
                <div className="pointer-events-auto inline-flex items-center rounded-2xl border border-border bg-background/90 p-1.5 text-[11px] shadow-sm backdrop-blur">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 rounded-xl px-4 text-[11px] font-semibold"
                  >
                    All drivers
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 rounded-xl px-4 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Available only
                  </Button>
                </div>
              </div>

              {/* Zoom + locate bottom-right */}
              <div className="pointer-events-none absolute bottom-6 right-6 z-20 flex flex-col gap-3">
                <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-border bg-background/95 shadow-sm">
                  <button className="border-b border-border p-2.5 text-muted-foreground hover:bg-muted/40">
                    <ZoomIn className="h-4 w-4" />
                  </button>
                  <button className="p-2.5 text-muted-foreground hover:bg-muted/40">
                    <ZoomOut className="h-4 w-4" />
                  </button>
                </div>
                <button className="pointer-events-auto rounded-2xl border border-border bg-background/95 p-2.5 text-muted-foreground shadow-sm hover:border-primary hover:bg-primary hover:text-primary-foreground transition-colors">
                  <Crosshair className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ORDER DETAILS / ASSIGNMENT SHEET - same as before, just sitting below */}
          <Sheet
            open={!!selectedOrder}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedOrder(null);
                setSelectedDriverId(null);
              }
            }}
          >
            <SheetContent className="w-full max-w-lg border-l border-border bg-background">
              {selectedOrder && (
                <>
                  <SheetHeader className="pb-4">
                    <SheetTitle className="flex items-center justify-between gap-2">
                      <span>{selectedOrder.internal_id ?? selectedOrder.id}</span>
                      <StatusPill status={String(selectedOrder.status)} />
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-4 text-sm">
                    {/* Overview */}
                    <section className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Overview
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User2 className="h-3 w-3" />
                        <span>
                          {selectedOrder.customer ?? "Customer"} {" - "}
                          {selectedOrder.customer_phone ?? "N/A"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-start gap-2 text-xs text-muted-foreground">
                        <Route className="mt-0.5 h-3 w-3" />
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-foreground">
                              {selectedOrder.pickup}
                            </span>
                            <span>-</span>
                            <span className="font-medium text-foreground">
                              {selectedOrder.dropoff}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="h-3 w-3" />
                            <span>
                              Created{" "}
                              {selectedOrder.createdAt
                                ? new Date(selectedOrder.createdAt).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    <Separator />

                    {/* Assignment */}
                    <section className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Assignment
                      </p>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User2 className="h-4 w-4" />
                          <span>Driver</span>
                        </div>
                        <Select
                          value={selectedDriverId ?? ""}
                          onValueChange={(value) => setSelectedDriverId(value)}
                        >
                          <SelectTrigger className="h-8 w-60 text-xs">
                            <SelectValue placeholder="Assign driver" />
                          </SelectTrigger>
                          <SelectContent>
                            {drivers.map((driver) => (
                              <SelectItem key={driver.id} value={driver.id}>
                                {driver.name} * {driver.status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Truck className="h-4 w-4" />
                          <span>Vehicle</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 cursor-default opacity-60"
                        >
                          Vehicle selection coming soon
                        </Button>
                      </div>

                      <div className="pt-1 text-[11px] text-muted-foreground">
                        After assigning, the order will move to the driver&apos;s
                        live manifest and appear as &quot;assigned&quot; in the
                        dispatch queue.
                      </div>

                      <Button
                        size="sm"
                        className="mt-1 w-full"
                        disabled={!selectedDriverId}
                        onClick={handleAssignDriver}
                      >
                        {assigning ? "Assigning..." : "Assign driver to order"}
                      </Button>
                      {assignMessage ? (
                        <div className="pt-2 text-[11px] text-muted-foreground">
                          {assignMessage}
                        </div>
                      ) : null}
                    </section>
                  </div>
                </>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </section>
    </AppShell>
  );
}

/* --- Small helper for status pill --- */

function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();

  const map: Record<string, { label: string; classes: string }> = {
    pending: {
      label: "Pending",
      classes: "bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/40",
    },
    assigned: {
      label: "Assigned",
      classes: "bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/40",
    },
    picked_up: {
      label: "Picked up",
      classes: "bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/40",
    },
    in_transit: {
      label: "In transit",
      classes: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/40",
    },
    delivered: {
      label: "Delivered",
      classes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/40",
    },
    cancelled: {
      label: "Cancelled",
      classes: "bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/40",
    },
  };

  const cfg =
    map[normalized] ?? {
      label: status,
      classes: "bg-muted/40 text-muted-foreground border-border",
    };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cfg.classes
      )}
    >
      {cfg.label}
    </span>
  );
}
