"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toast, ToastTone } from "@/components/ui/toast";
import { Calendar, Fuel, Gauge, HeartPulse, MapPin, User, Wrench } from "lucide-react";

interface VehicleDetail {
  _id: string;
  name: string;
  plateNumber?: string;
  type?: string;
  status?: string;
  capacity?: number;
  capacityUsed?: number;
  fuelType?: string;
  mileage?: number;
  odometer?: number;
  fuelLevel?: number;
  healthStatus?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  lastSyncedAt?: string;
  assignedDriver?: { _id: string; name?: string; phone?: string };
  maintenanceHistory?: {
    title: string;
    performedAt?: string;
    status?: string;
    notes?: string;
  }[];
}

export default function VehicleDetailsPage() {
  const params = useParams<{ id: string }>();
  const [vehicle, setVehicle] = useState<VehicleDetail | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [maintenanceForm, setMaintenanceForm] = useState({
    title: "",
    performedAt: "",
    status: "scheduled",
    notes: "",
    nextServiceDue: "",
  });
  const [maintenanceSaving, setMaintenanceSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/vehicles/${params.id}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load vehicle");
        const data = await res.json();
        setVehicle(data);
      } catch (err) {
        setToast({ message: err instanceof Error ? err.message : "Error loading vehicle", tone: "error" });
      }
    };
    load();
  }, [params.id]);

  const handleAddMaintenance = async () => {
    if (!maintenanceForm.title.trim() || maintenanceSaving) {
      setToast({ message: "Maintenance title is required", tone: "error" });
      return;
    }

    setMaintenanceSaving(true);
    try {
      const res = await fetch(`/api/vehicles/${params.id}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: maintenanceForm.title.trim(),
          performedAt: maintenanceForm.performedAt || undefined,
          status: maintenanceForm.status,
          notes: maintenanceForm.notes || undefined,
          nextServiceDue: maintenanceForm.nextServiceDue || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add maintenance");
      setVehicle(data);
      setMaintenanceForm({ title: "", performedAt: "", status: "scheduled", notes: "", nextServiceDue: "" });
      setToast({ message: "Maintenance logged", tone: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to add maintenance", tone: "error" });
    } finally {
      setMaintenanceSaving(false);
    }
  };

  return (
    <AppShell>
      {!vehicle ? (
        <div className="text-sm text-muted-foreground">Loading vehicle details...</div>
      ) : (
        <section className="space-y-6 pb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Fleet / Vehicles / {vehicle.name}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-foreground">
                {vehicle.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge variant={statusVariant(vehicle.status)} className="uppercase text-[10px]">
                  {vehicle.status || "available"}
                </Badge>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {vehicle.type || "vehicle"}
                </Badge>
                <span>
                  Last synced: {vehicle.lastSyncedAt ? formatRelative(vehicle.lastSyncedAt) : "unknown"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">
                Schedule service
              </Button>
              <Button size="sm">Edit details</Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Odometer"
              value={`${formatNumber(vehicle.odometer ?? vehicle.mileage)} mi`}
              detail={`+${formatNumber(vehicle.mileage)} mi today`}
              icon={<Gauge className="h-4 w-4" />}
            />
            <MetricCard
              label="Fuel level"
              value={`${formatNumber(vehicle.fuelLevel)}%`}
              detail={vehicle.fuelType || "Fuel type pending"}
              icon={<Fuel className="h-4 w-4" />}
            />
            <MetricCard
              label="Vehicle health"
              value={formatHealth(vehicle.healthStatus)}
              detail="No critical alerts detected"
              icon={<HeartPulse className="h-4 w-4" />}
            />
            <MetricCard
              label="Next service"
              value={vehicle.nextServiceDue ? formatDate(vehicle.nextServiceDue) : "TBD"}
              detail={vehicle.nextServiceDue ? "Service scheduled" : "No service scheduled"}
              icon={<Calendar className="h-4 w-4" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-6">
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 rounded-2xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Live vehicle location map coming soon.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assigned driver</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/20">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {vehicle.assignedDriver?.name || "No driver assigned"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {vehicle.assignedDriver?.phone || "Phone unavailable"}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    View profile
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="text-sm">Maintenance history</CardTitle>
                  <Button size="sm" variant="link">
                    View full log
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-b border-border px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        value={maintenanceForm.title}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, title: e.target.value })}
                        placeholder="Service title"
                        className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                      />
                      <select
                        value={maintenanceForm.status}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, status: e.target.value })}
                        className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="completed">Completed</option>
                        <option value="overdue">Overdue</option>
                      </select>
                      <input
                        value={maintenanceForm.performedAt}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedAt: e.target.value })}
                        type="date"
                        className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                      />
                      <input
                        value={maintenanceForm.nextServiceDue}
                        onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextServiceDue: e.target.value })}
                        type="date"
                        className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                      />
                    </div>
                    <textarea
                      value={maintenanceForm.notes}
                      onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                      placeholder="Notes (optional)"
                      className="mt-3 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" onClick={handleAddMaintenance} disabled={maintenanceSaving}>
                        {maintenanceSaving ? "Saving..." : "Add maintenance"}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-56">
                    <div className="divide-y divide-border">
                      {(vehicle.maintenanceHistory ?? []).map((entry, index) => (
                        <div key={`${entry.title}-${index}`} className="px-4 py-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">{entry.title}</span>
                            <Badge variant={maintenanceVariant(entry.status)} className="text-[10px] uppercase">
                              {entry.status || "scheduled"}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.performedAt ? formatDate(entry.performedAt) : "Scheduled"}
                          </div>
                        </div>
                      ))}
                      {(vehicle.maintenanceHistory ?? []).length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground">
                          No maintenance history yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Vehicle specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <Spec label="VIN" value={vehicle.vin || "--"} />
                    <Spec label="License plate" value={vehicle.plateNumber || "--"} />
                    <Spec label="Make" value={vehicle.make || "--"} />
                    <Spec label="Model" value={vehicle.model || "--"} />
                    <Spec label="Year" value={vehicle.year ? vehicle.year.toString() : "--"} />
                    <Spec label="Type" value={vehicle.type || "--"} />
                    <Spec label="Color" value={vehicle.color || "--"} />
                    <Spec label="Fuel type" value={vehicle.fuelType || "--"} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Capacity usage</span>
                      <span>{formatNumber(vehicle.capacityUsed)}% used</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/20">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${clampPercent(vehicle.capacityUsed)}%` }}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4" />
                      Next service: {vehicle.nextServiceDue ? formatDate(vehicle.nextServiceDue) : "TBD"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </AppShell>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-2 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.2em]">{label}</div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}

function statusVariant(status?: string) {
  if (status === "in_use") return "info";
  if (status === "maintenance") return "warning";
  if (status === "retired") return "danger";
  return "success";
}

function maintenanceVariant(status?: string) {
  if (status === "completed") return "success";
  if (status === "overdue") return "danger";
  return "warning";
}

function formatNumber(value?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toLocaleString();
}

function formatDate(value?: string) {
  if (!value) return "TBD";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(value?: string) {
  if (!value) return "unknown";
  const date = new Date(value);
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatHealth(status?: string) {
  if (!status) return "Good";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function clampPercent(value?: number) {
  if (!value || Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
