"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Toast, ToastTone } from "@/components/ui/toast";
import { MapPin, MessageSquare, Pencil, Shield } from "lucide-react";

interface DriverDetail {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  status?: string;
  employeeId?: string;
  employmentType?: string;
  rating?: number;
  reviewsCount?: number;
  onTimeRate?: number;
  totalDeliveries?: number;
  distanceDriven?: number;
  vehicle?: { _id: string; name?: string; plateNumber?: string; type?: string };
  activityHistory?: {
    date: string;
    routeId?: string;
    zone?: string;
    status?: string;
    durationMinutes?: number;
  }[];
  documents?: { title: string; uploadedAt?: string }[];
  payroll?: { period: string; amount: number; status?: string }[];
  incidents?: { title: string; reportedAt?: string; status?: string }[];
}

type DriverTab = "activity" | "documents" | "payroll" | "incidents";

export default function DriverDetailsPage() {
  const params = useParams<{ id: string }>();
  const [driver, setDriver] = useState<DriverDetail | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [activeTab, setActiveTab] = useState<DriverTab>("activity");

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/drivers/${params.id}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load driver");
        const data = await res.json();
        setDriver(data);
      } catch (err) {
        setToast({ message: err instanceof Error ? err.message : "Error loading driver", tone: "error" });
      }
    };
    load();
  }, [params.id]);

  const tabs = useMemo(
    () => [
      { id: "activity", label: "Activity History" },
      { id: "documents", label: "Documents" },
      { id: "payroll", label: "Payroll" },
      { id: "incidents", label: "Incidents" },
    ],
    []
  );

  return (
    <AppShell>
      {!driver ? (
        <div className="text-sm text-muted-foreground">Loading driver details...</div>
      ) : (
        <section className="space-y-6 pb-10">
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Fleet / Drivers / {driver.name}
          </div>

          <Card className="border-border bg-card/85">
            <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-muted/30 text-lg font-semibold">
                  {getInitials(driver.name)}
                </div>
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-foreground">{driver.name}</div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>ID: {driver.employeeId || "Pending"}</span>
                    <span>{driver.phone || "No phone"}</span>
                    <span>{driver.email || "No email"}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(driver.status)} className="uppercase text-[10px]">
                      {driver.status || "inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {formatEmployment(driver.employmentType)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Message
                </Button>
                <Button size="sm" variant="outline" className="gap-2">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button size="sm" variant="destructive" className="gap-2">
                  <Shield className="h-3.5 w-3.5" />
                  Suspend
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              label="Total deliveries"
              value={formatNumber(driver.totalDeliveries)}
              detail="vs last month"
            />
            <MetricCard
              label="On-time rate"
              value={formatPercent(driver.onTimeRate)}
              detail="vs fleet avg"
            />
            <MetricCard
              label="Avg rating"
              value={formatRating(driver.rating)}
              detail={`From ${driver.reviewsCount ?? 0} reviews`}
            />
            <MetricCard
              label="Distance driven"
              value={`${formatNumber(driver.distanceDriven)} km`}
              detail="This month"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
            <div className="space-y-6">
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Assigned vehicle</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-xs uppercase text-muted-foreground">Operational</div>
                    <div className="mt-2 text-sm font-semibold text-foreground">
                      {driver.vehicle?.name || "No vehicle assigned"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {driver.vehicle?.plateNumber || "Plate pending"}
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div>Model: {driver.vehicle?.type || "Not set"}</div>
                    <div>License: {driver.vehicle?.plateNumber || "--"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Current location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-40 rounded-2xl border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5" />
                      Live location feed coming soon.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border bg-card/80">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as DriverTab)}
                      className={`pb-2 ${
                        activeTab === tab.id
                          ? "border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {activeTab === "activity" && (
                  <ScrollArea className="h-72">
                    <div className="space-y-3">
                      {(driver.activityHistory ?? []).map((entry, index) => (
                        <div
                          key={`${entry.routeId}-${index}`}
                          className="rounded-2xl border border-border bg-muted/20 px-4 py-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-foreground">
                              Route {entry.routeId || "TBD"}
                            </span>
                            <Badge variant={activityVariant(entry.status)} className="text-[10px] uppercase">
                              {entry.status || "pending"}
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatDate(entry.date)} · {entry.zone || "Zone pending"}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Duration: {formatDuration(entry.durationMinutes)}
                          </div>
                        </div>
                      ))}
                      {(driver.activityHistory ?? []).length === 0 && (
                        <div className="text-sm text-muted-foreground">
                          No activity history yet.
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}

                {activeTab === "documents" && (
                  <div className="space-y-3 text-sm">
                    {(driver.documents ?? []).map((doc, index) => (
                      <div key={`${doc.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <span className="font-medium text-foreground">{doc.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {doc.uploadedAt ? formatDate(doc.uploadedAt) : "Pending"}
                        </span>
                      </div>
                    ))}
                    {(driver.documents ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No documents uploaded yet.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "payroll" && (
                  <div className="space-y-3 text-sm">
                    {(driver.payroll ?? []).map((item, index) => (
                      <div key={`${item.period}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <div>
                          <div className="font-medium text-foreground">{item.period}</div>
                          <div className="text-xs text-muted-foreground">Payroll run</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(item.amount)}</div>
                          <Badge variant={payrollVariant(item.status)} className="text-[10px] uppercase">
                            {item.status || "pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {(driver.payroll ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        Payroll history unavailable.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "incidents" && (
                  <div className="space-y-3 text-sm">
                    {(driver.incidents ?? []).map((incident, index) => (
                      <div key={`${incident.title}-${index}`} className="flex items-center justify-between rounded-2xl border border-border bg-muted/20 px-4 py-3">
                        <div>
                          <div className="font-medium text-foreground">{incident.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {incident.reportedAt ? formatDate(incident.reportedAt) : "Reported date pending"}
                          </div>
                        </div>
                        <Badge variant={incidentVariant(incident.status)} className="text-[10px] uppercase">
                          {incident.status || "open"}
                        </Badge>
                      </div>
                    ))}
                    {(driver.incidents ?? []).length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No incidents reported.
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}
    </AppShell>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function statusVariant(status?: string) {
  if (status === "active") return "success";
  if (status === "on_break") return "warning";
  if (status === "off_duty") return "secondary";
  return "muted";
}

function activityVariant(status?: string) {
  if (status === "completed") return "success";
  if (status === "late") return "warning";
  if (status === "in_progress") return "info";
  return "muted";
}

function payrollVariant(status?: string) {
  if (status === "paid") return "success";
  return "warning";
}

function incidentVariant(status?: string) {
  if (status === "resolved") return "success";
  return "danger";
}

function formatEmployment(value?: string) {
  if (!value) return "full time";
  return value.replace("_", " ");
}

function formatNumber(value?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toLocaleString();
}

function formatPercent(value?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${value.toFixed(1)}%`;
}

function formatRating(value?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return value.toFixed(1);
}

function formatDate(value?: string) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDuration(minutes?: number) {
  if (!minutes) return "--";
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hrs ? `${hrs}h ${mins}m` : `${mins}m`;
}

function formatCurrency(value?: number) {
  if (!value) return "--";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-border bg-card/80">
      <CardContent className="space-y-2 py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-lg font-semibold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}
