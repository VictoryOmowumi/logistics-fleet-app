"use client";

import { AppShell } from "@/components/layout/AppShell";
import { FleetService } from "@/lib/services/fleetService";
import type { Driver } from "@/types";
import useSWR from "swr";

export default function FleetPage() {
  const { data: drivers, isLoading, error } = useSWR<Driver[]>("drivers", () => FleetService.getDrivers(), {
    refreshInterval: 5000,
  });

  return (
    <AppShell>
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Fleet Management</h1>
            <p className="text-sm text-muted-foreground">Manage drivers and vehicles in your network.</p>
          </div>
        </header>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Deliveries Today</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-xs text-muted-foreground">
                    Loading drivers from Fleetbase...
                  </td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-xs text-red-500">
                    Failed to load drivers.
                  </td>
                </tr>
              )}
              {!isLoading && !error && (drivers ?? []).map((driver) => (
                <tr key={driver.id} className="border-t border-border hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{driver.name}</td>
                  <td className="px-4 py-3 text-sm">{driver.phone ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-xs font-medium">
                      {driver.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{driver.vehicle ?? "-"}</td>
                  <td className="px-4 py-3 text-sm">{driver.jobCount ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
