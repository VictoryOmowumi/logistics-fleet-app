"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Toast, ToastTone } from "@/components/ui/toast";
import {
  Calendar,
  Clock,
  FileText,
  MapPin,
  Package,
  QrCode,
  Truck,
  User,
} from "lucide-react";

interface OrderDetail {
  _id: string;
  orderNumber: string;
  status: string;
  referenceNumber?: string;
  priority?: string;
  customer?: { name?: string; phone?: string; email?: string };
  pickup?: { address?: string; city?: string; state?: string; zipCode?: string };
  delivery?: { address?: string; city?: string; state?: string; zipCode?: string };
  assignedDriver?: { _id: string; name?: string; phone?: string; email?: string };
  assignedVehicle?: { _id: string; name?: string; plateNumber?: string; type?: string };
  items?: {
    description: string;
    sku?: string;
    quantity: number;
    weight?: number;
    status?: string;
    dimensions?: { length: number; width: number; height: number; unit?: string };
  }[];
  totalWeight?: number;
  totalVolume?: number;
  estimatedArrival?: string;
  delayMinutes?: number;
  activityLog?: { message: string; timestamp: string; actor?: string }[];
  notes?: string;
  createdAt?: string;
}

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending" },
  { label: "Assigned", value: "assigned" },
  { label: "Picked Up", value: "picked_up" },
  { label: "In Transit", value: "in_transit" },
  { label: "Delivered", value: "delivered" },
  { label: "Cancelled", value: "cancelled" },
];

type LineItem = NonNullable<OrderDetail["items"]>[number];

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const [statusChoice, setStatusChoice] = useState("pending");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [activityMessage, setActivityMessage] = useState("");
  const [activitySubmitting, setActivitySubmitting] = useState(false);
  const [itemsDraft, setItemsDraft] = useState<LineItem[]>([]);
  const [itemForm, setItemForm] = useState({
    description: "",
    sku: "",
    quantity: "1",
    weight: "",
  });
  const [manifestSaving, setManifestSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/orders/${params.id}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load order");
        const data = await res.json();
        setOrder(data);
      } catch (err) {
        setToast({ message: err instanceof Error ? err.message : "Error loading order", tone: "error" });
      }
    };
    load();
  }, [params.id]);

  useEffect(() => {
    if (!order) return;
    setStatusChoice(order.status || "pending");
    setItemsDraft(order.items ?? []);
  }, [order]);

  const handleStatusUpdate = async () => {
    if (!order || statusUpdating) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: statusChoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
      setOrder(data);
      setToast({ message: "Status updated", tone: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update status", tone: "error" });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddActivity = async () => {
    if (!activityMessage.trim() || activitySubmitting) return;
    setActivitySubmitting(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: activityMessage.trim(), type: "note" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add activity");
      setOrder(data);
      setActivityMessage("");
      setToast({ message: "Activity logged", tone: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to add activity", tone: "error" });
    } finally {
      setActivitySubmitting(false);
    }
  };

  const handleAddItem = () => {
    const description = itemForm.description.trim();
    const quantity = parseInt(itemForm.quantity, 10);
    if (!description || Number.isNaN(quantity) || quantity <= 0) {
      setToast({ message: "Item description and quantity are required", tone: "error" });
      return;
    }
    const weight = itemForm.weight ? Number(itemForm.weight) : undefined;
    const nextItem: LineItem = {
      description,
      sku: itemForm.sku || undefined,
      quantity,
      weight: Number.isNaN(weight) ? undefined : weight,
      status: "pending",
    };
    setItemsDraft((prev) => [...prev, nextItem]);
    setItemForm({ description: "", sku: "", quantity: "1", weight: "" });
  };

  const handleRemoveItem = (index: number) => {
    setItemsDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveManifest = async () => {
    if (!order || manifestSaving) return;
    setManifestSaving(true);
    try {
      const res = await fetch(`/api/orders/${params.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items: itemsDraft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update manifest");
      setOrder(data);
      setToast({ message: "Manifest updated", tone: "success" });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Failed to update manifest", tone: "error" });
    } finally {
      setManifestSaving(false);
    }
  };

  return (
    <AppShell>
      {!order ? (
        <div className="text-sm text-muted-foreground">Loading order details...</div>
      ) : (
        <section className="space-y-6 pb-10">
          <div className="space-y-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Orders / Active shipments
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold text-foreground">
                  Order {order.orderNumber}
                </h1>
                <Badge variant={statusToVariant(order.status)} className="uppercase">
                  {formatStatus(order.status)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {order.createdAt ? formatDate(order.createdAt) : "Created date pending"}
                </span>
                <span className="inline-flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Ref: {order.referenceNumber || "Not assigned"}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">
                Edit
              </Button>
              <Button size="sm" variant="outline">
                BOL
              </Button>
              <Button size="sm">Manifest</Button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <Card className="border-border bg-card/80">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Current status</span>
                  {order.delayMinutes ? (
                    <Badge variant="warning" className="text-[10px] uppercase">
                      Delay +{order.delayMinutes}m
                    </Badge>
                  ) : null}
                </div>
                <div className="text-lg font-semibold">
                  {formatStatus(order.status)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Shipment state and latest scan.
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total weight</span>
                  <Package className="h-4 w-4" />
                </div>
                <div className="text-lg font-semibold">
                  {formatNumber(order.totalWeight)} lbs
                </div>
                <div className="text-xs text-muted-foreground">
                  Split across {order.items?.length ?? 0} line items.
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Volume</span>
                  <Package className="h-4 w-4" />
                </div>
                <div className="text-lg font-semibold">
                  {formatNumber(order.totalVolume)} cu ft
                </div>
                <div className="text-xs text-muted-foreground">
                  Standard cargo van.
                </div>
              </CardContent>
            </Card>
            <Card className="border-border bg-card/80">
              <CardContent className="space-y-2 py-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Estimated arrival</span>
                  <Clock className="h-4 w-4" />
                </div>
                <div className="text-lg font-semibold">
                  {order.estimatedArrival ? formatTime(order.estimatedArrival) : "Pending"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {order.estimatedArrival ? formatDate(order.estimatedArrival) : "Awaiting ETA"}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.7fr_1fr]">
            <div className="space-y-6">
              <Card className="border-border bg-card/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm">Line items</CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {order.items?.length ?? 0} items
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-12 gap-2 border-b border-border px-4 py-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                    <div className="col-span-4">Product</div>
                    <div className="col-span-2">SKU</div>
                    <div className="col-span-1 text-right">Qty</div>
                    <div className="col-span-3">Dimensions</div>
                    <div className="col-span-1 text-right">Weight</div>
                    <div className="col-span-1 text-right">Status</div>
                  </div>
                  <div className="divide-y divide-border">
                    {(order.items ?? []).map((item, index) => (
                      <div
                        key={`${item.description}-${index}`}
                        className="grid grid-cols-12 gap-2 px-4 py-3 text-sm"
                      >
                        <div className="col-span-4 font-medium text-foreground">
                          {item.description}
                        </div>
                        <div className="col-span-2 text-xs text-muted-foreground">
                          {item.sku || "--"}
                        </div>
                        <div className="col-span-1 text-right text-xs">
                          {item.quantity}
                        </div>
                        <div className="col-span-3 text-xs text-muted-foreground">
                          {formatDimensions(item.dimensions)}
                        </div>
                        <div className="col-span-1 text-right text-xs">
                          {formatNumber(item.weight)} lbs
                        </div>
                        <div className="col-span-1 text-right">
                          <Badge
                            variant={itemStatusVariant(item.status)}
                            className="text-[10px] uppercase"
                          >
                            {item.status || "pending"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                    {(order.items ?? []).length === 0 && (
                      <div className="px-4 py-6 text-sm text-muted-foreground">
                        Line items will appear once manifest details are added.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm">Manifest editor</CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {itemsDraft.length} draft
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <input
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      placeholder="Description"
                      className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                    />
                    <input
                      value={itemForm.sku}
                      onChange={(e) => setItemForm({ ...itemForm, sku: e.target.value })}
                      placeholder="SKU"
                      className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                    />
                    <input
                      value={itemForm.quantity}
                      onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                      placeholder="Qty"
                      type="number"
                      className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                    />
                    <input
                      value={itemForm.weight}
                      onChange={(e) => setItemForm({ ...itemForm, weight: e.target.value })}
                      placeholder="Weight (lbs)"
                      type="number"
                      className="rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Button size="sm" variant="outline" onClick={handleAddItem} type="button">
                      Add item
                    </Button>
                    <Button size="sm" onClick={handleSaveManifest} disabled={manifestSaving} type="button">
                      {manifestSaving ? "Saving..." : "Save manifest"}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {itemsDraft.map((item, index) => (
                      <div key={`${item.description}-${index}`} className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs">
                        <div className="font-medium text-foreground">{item.description}</div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span>Qty {item.quantity}</span>
                          {item.sku ? <span>SKU {item.sku}</span> : null}
                          <button
                            type="button"
                            className="text-red-500 hover:underline"
                            onClick={() => handleRemoveItem(index)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    {itemsDraft.length === 0 && (
                      <div className="text-xs text-muted-foreground">
                        Add line items to build the manifest.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm">Activity log</CardTitle>
                  <Badge variant="outline" className="text-[11px]">
                    {order.activityLog?.length ?? 0} updates
                  </Badge>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={activityMessage}
                        onChange={(e) => setActivityMessage(e.target.value)}
                        placeholder="Add an update or note..."
                        className="flex-1 rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                      />
                      <Button size="sm" onClick={handleAddActivity} disabled={activitySubmitting}>
                        {activitySubmitting ? "Saving..." : "Add"}
                      </Button>
                    </div>
                  </div>
                  <ScrollArea className="h-60">
                    <div className="divide-y divide-border">
                      {(order.activityLog ?? []).map((entry, index) => (
                        <div key={`${entry.message}-${index}`} className="px-4 py-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">
                              {entry.message}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(entry.timestamp)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(entry.timestamp)}
                            {entry.actor ? ` · ${entry.actor}` : ""}
                          </div>
                        </div>
                      ))}
                      {(order.activityLog ?? []).length === 0 && (
                        <div className="px-4 py-6 text-sm text-muted-foreground">
                          No activity logged yet.
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
                  <CardTitle className="text-sm">Update status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <select
                    value={statusChoice}
                    onChange={(e) => setStatusChoice(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" onClick={handleStatusUpdate} disabled={statusUpdating}>
                    {statusUpdating ? "Updating..." : "Update status"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Customer &amp; delivery</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/30">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {order.customer?.name || "Customer pending"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.customer?.email || "No email on file"}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5" />
                      <span>{formatAddress(order.delivery)}</span>
                    </div>
                    <div>{order.customer?.phone || "No contact phone"}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Driver assignment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted/30">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {order.assignedDriver?.name || "Driver unassigned"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {order.assignedVehicle?.name || "Vehicle unassigned"}
                        {order.assignedVehicle?.plateNumber
                          ? ` · ${order.assignedVehicle.plateNumber}`
                          : ""}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {order.assignedDriver?.phone || "No driver contact"}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Scan package</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-2xl border border-border bg-muted/20 px-6 py-8 text-center">
                    <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
                    <div className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                      {order.orderNumber}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    For driver verification at pickup and dropoff.
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

function statusToVariant(status?: string) {
  const value = status ?? "pending";
  if (value === "delivered") return "success";
  if (value === "in_transit") return "info";
  if (value === "cancelled") return "danger";
  if (value === "picked_up" || value === "assigned") return "secondary";
  return "warning";
}

function formatStatus(status?: string) {
  return (status || "pending").replace("_", " ");
}

function formatDate(value?: string) {
  if (!value) return "Pending";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(value?: string) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatNumber(value?: number) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return Number(value).toLocaleString();
}

function formatDimensions(dim?: {
  length: number;
  width: number;
  height: number;
  unit?: string;
}) {
  if (!dim) return "--";
  const unit = dim.unit || "in";
  return `${dim.length} x ${dim.width} x ${dim.height} ${unit}`;
}

function itemStatusVariant(status?: string) {
  if (status === "picked") return "success";
  if (status === "packed") return "info";
  return "muted";
}

function formatAddress(address?: {
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}) {
  if (!address) return "Delivery address pending";
  return [address.address, address.city, address.state, address.zipCode]
    .filter(Boolean)
    .join(", ");
}
