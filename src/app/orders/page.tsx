"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { DataGrid, GridColumn, GridFilter } from "@/components/ui/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardHeader } from "@/components/ui/card";
import { Toast, ToastTone } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface OrderRow {
  _id: string;
  orderNumber: string;
  status: "pending" | "assigned" | "picked_up" | "in_transit" | "delivered" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  customer?: { name?: string; phone?: string };
  pickup?: { city?: string; address?: string };
  delivery?: { city?: string; address?: string };
  createdAt?: string;
}

interface OrdersResponse {
  orders: OrderRow[];
  pagination: { total: number; page: number; pages: number };
}

type ToastState = { message: string; tone: ToastTone } | null;

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

const STATUS_OPTIONS = [
  { label: "Pending", value: "pending", tone: "warning" as const },
  { label: "Assigned", value: "assigned", tone: "muted" as const },
  { label: "Picked Up", value: "picked_up", tone: "muted" as const },
  { label: "In Transit", value: "in_transit", tone: "muted" as const },
  { label: "Delivered", value: "delivered", tone: "success" as const },
  { label: "Cancelled", value: "cancelled", tone: "danger" as const },
];

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export default function OrdersPage() {
  const { data, isLoading, error } = useSWR<OrdersResponse>('/api/orders', fetcher, {
    refreshInterval: 10000,
  });

  const [toast, setToast] = useState<ToastState>(null);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<OrderRow | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<OrderRow[] | null>(null);
  const [formData, setFormData] = useState({
    referenceNumber: "",
    priority: "medium" as NonNullable<OrderRow["priority"]>,
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    pickupAddress: "",
    pickupCity: "",
    pickupState: "",
    pickupZip: "",
    pickupScheduledTime: "",
    deliveryAddress: "",
    deliveryCity: "",
    deliveryState: "",
    deliveryZip: "",
    deliveryScheduledTime: "",
    notes: "",
  });

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  };

  const columns = useMemo<GridColumn<OrderRow>[]>(() => [
    {
      id: "orderNumber",
      header: "Order",
      accessor: (row) => (
        <div className="space-y-1">
          <Link href={`/orders/${row._id}`} className="font-semibold text-foreground hover:underline">
            {row.orderNumber}
          </Link>
          <p className="text-xs text-muted-foreground">{row.customer?.name || row.customer?.phone || "--"}</p>
        </div>
      ),
      sortValue: (row) => row.orderNumber,
      exportValue: (row) => row.orderNumber,
      minWidth: "180px",
    },
    {
      id: "route",
      header: "Route",
      accessor: (row) => (
        <div className="text-sm text-foreground">
          <p>{row.pickup?.city || row.pickup?.address || "--"}</p>
          <p className="text-xs text-muted-foreground">{row.delivery?.city || row.delivery?.address || "--"}</p>
        </div>
      ),
      minWidth: "200px",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => {
        const meta = STATUS_OPTIONS.find((s) => s.value === row.status);
        return <Badge variant={meta?.tone || "muted"}>{meta?.label || row.status}</Badge>;
      },
      sortValue: (row) => row.status,
      exportValue: (row) => row.status,
      minWidth: "120px",
    },
    {
      id: "priority",
      header: "Priority",
      accessor: (row) => row.priority || "medium",
      sortValue: (row) => row.priority || "medium",
      exportValue: (row) => row.priority || "medium",
      minWidth: "110px",
      align: "center",
    },
    {
      id: "created",
      header: "Created",
      accessor: (row) => (row.createdAt ? new Date(row.createdAt).toLocaleString() : "--"),
      sortValue: (row) => (row.createdAt ? new Date(row.createdAt).getTime() : 0),
      exportValue: (row) => row.createdAt || "",
      minWidth: "160px",
      align: "right",
    },
  ], []);

  const filters = useMemo<GridFilter<OrderRow>[]>(() => [
    {
      id: "status",
      label: "Status",
      placeholder: "All statuses",
      options: STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
      predicate: (row, value) => row.status === value,
    },
    {
      id: "priority",
      label: "Priority",
      placeholder: "All priorities",
      options: PRIORITY_OPTIONS,
      predicate: (row, value) => row.priority === value,
    },
  ], []);

  const searchKeys: (keyof OrderRow | string)[] = [
    "orderNumber",
    "customer.name",
    "customer.phone",
    "pickup.city",
    "pickup.address",
    "delivery.city",
    "delivery.address",
    "status",
    "priority",
  ];

  const activeCount = useMemo(() => (
    data?.orders?.filter((order) =>
      ["pending", "assigned", "picked_up", "in_transit"].includes(order.status)
    ).length ?? 0
  ), [data]);

  const deleteOrder = async (order: OrderRow) => {
    try {
      const res = await fetch(`/api/orders/${order._id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete order");
      mutate('/api/orders');
      showToast("Order deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    }
  };

  const deleteBulkOrders = async (rows: OrderRow[]) => {
    if (!rows.length) return;
    setBulkDeleting(true);
    try {
      const responses = await Promise.all(
        rows.map((order) => fetch(`/api/orders/${order._id}`, { method: "DELETE", credentials: "include" }))
      );
      const failed = responses.find((res) => !res.ok);
      if (failed) throw new Error("One or more deletions failed");
      mutate('/api/orders');
      showToast("Orders deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const renderRowActions = (order: OrderRow) => (
    <div className="flex items-center justify-end gap-2">
      <Link href={`/orders/${order._id}`} className="text-sm text-foreground hover:underline">
        View
      </Link>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600"
        onClick={() => setPendingDelete(order)}
      >
        Delete
      </Button>
    </div>
  );

  const openCreateModal = () => {
    setFormData({
      referenceNumber: "",
      priority: "medium",
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      pickupAddress: "",
      pickupCity: "",
      pickupState: "",
      pickupZip: "",
      pickupScheduledTime: "",
      deliveryAddress: "",
      deliveryCity: "",
      deliveryState: "",
      deliveryZip: "",
      deliveryScheduledTime: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        referenceNumber: formData.referenceNumber || undefined,
        status: "pending" as OrderRow["status"],
        priority: formData.priority,
        customer: {
          name: formData.customerName,
          email: formData.customerEmail || undefined,
          phone: formData.customerPhone,
        },
        pickup: {
          address: formData.pickupAddress,
          city: formData.pickupCity,
          state: formData.pickupState,
          zipCode: formData.pickupZip,
          scheduledTime: formData.pickupScheduledTime || undefined,
        },
        delivery: {
          address: formData.deliveryAddress,
          city: formData.deliveryCity,
          state: formData.deliveryState,
          zipCode: formData.deliveryZip,
          scheduledTime: formData.deliveryScheduledTime || undefined,
        },
        notes: formData.notes || undefined,
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      mutate("/api/orders");
      setShowModal(false);
      showToast("Order created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <ListPageLayout
        title="Orders"
        description="Monitor active and historical shipments."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => mutate('/api/orders')}>
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={openCreateModal}>
              New Order
            </Button>
          </div>
        }
        stats={
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total orders</p>
                  <p className="text-2xl font-semibold">{data?.pagination?.total ?? "--"}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>

            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold">{activeCount}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>
          </div>
        }
      >
        <DataGrid
          title="Orders"
          description="Search, filter, export, and bulk-manage orders."
          data={data?.orders ?? []}
          columns={columns}
          keyField="_id"
          searchKeys={searchKeys}
          filters={filters}
          isLoading={isLoading}
          error={error ? "Failed to load orders." : null}
          emptyText="No orders found."
          selectable
          bulkActions={[
            {
              label: bulkDeleting ? "Deleting..." : "Delete Selected",
              disabledLabel: "Delete Selected",
              onClick: (rows) => setPendingBulkDelete(rows),
            },
          ]}
          enableCsvExport
          csvFileName="orders.csv"
          renderRowActions={renderRowActions}
          actionsLabel="Actions"
        />
      </ListPageLayout>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>Create order</DialogTitle>
            <DialogDescription>Capture core shipment details for dispatch.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 no-scrollbar" id="order-form">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Reference Number"
                value={formData.referenceNumber}
                onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
              />
            </div>
            <LabeledSelect
              label="Priority"
              value={formData.priority}
              onValueChange={(value) => setFormData({ ...formData, priority: value as NonNullable<OrderRow["priority"]> })}
              options={PRIORITY_OPTIONS}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Customer Name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                required
              />
              <Input
                label="Customer Phone"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                required
              />
            </div>
            <Input
              label="Customer Email"
              type="email"
              value={formData.customerEmail}
              onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Pickup Address"
                value={formData.pickupAddress}
                onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                required
              />
              <Input
                label="Pickup City"
                value={formData.pickupCity}
                onChange={(e) => setFormData({ ...formData, pickupCity: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Pickup State"
                value={formData.pickupState}
                onChange={(e) => setFormData({ ...formData, pickupState: e.target.value })}
                required
              />
              <Input
                label="Pickup Zip"
                value={formData.pickupZip}
                onChange={(e) => setFormData({ ...formData, pickupZip: e.target.value })}
                required
              />
            </div>
            <Input
              label="Pickup Scheduled Time"
              type="datetime-local"
              value={formData.pickupScheduledTime}
              onChange={(e) => setFormData({ ...formData, pickupScheduledTime: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Delivery Address"
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                required
              />
              <Input
                label="Delivery City"
                value={formData.deliveryCity}
                onChange={(e) => setFormData({ ...formData, deliveryCity: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Delivery State"
                value={formData.deliveryState}
                onChange={(e) => setFormData({ ...formData, deliveryState: e.target.value })}
                required
              />
              <Input
                label="Delivery Zip"
                value={formData.deliveryZip}
                onChange={(e) => setFormData({ ...formData, deliveryZip: e.target.value })}
                required
              />
            </div>
            <Input
              label="Delivery Scheduled Time"
              type="datetime-local"
              value={formData.deliveryScheduledTime}
              onChange={(e) => setFormData({ ...formData, deliveryScheduledTime: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="min-h-20 w-full rounded-xl border border-border bg-background/70 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                placeholder="Additional instructions or dispatch notes."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} radius="sm" type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" radius="sm" disabled={submitting} form="order-form">
                {submitting ? "Saving..." : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete order"
        description={pendingDelete ? `Delete order ${pendingDelete.orderNumber}? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteOrder(pendingDelete);
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(null);
        }}
        title="Delete selected orders"
        description={
          pendingBulkDelete
            ? `Delete ${pendingBulkDelete.length} order${pendingBulkDelete.length > 1 ? "s" : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel={bulkDeleting ? "Deleting..." : "Delete"}
        onConfirm={() => {
          if (pendingBulkDelete) {
            void deleteBulkOrders(pendingBulkDelete);
            setPendingBulkDelete(null);
          }
        }}
      />
    </AppShell>
  );
}
