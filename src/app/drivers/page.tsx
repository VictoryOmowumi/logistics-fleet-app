"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LabeledSelect } from "@/components/ui/labeled-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DataGrid, GridColumn, GridFilter } from "@/components/ui/data-grid";
import { Toast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: "active" | "inactive" | "on_break" | "off_duty";
  employeeId?: string;
  employmentType?: "full_time" | "contract" | "part_time";
  rating?: number;
  reviewsCount?: number;
  onTimeRate?: number;
  totalDeliveries?: number;
  distanceDriven?: number;
  activityHistory?: unknown[];
  documents?: unknown[];
  payroll?: unknown[];
  incidents?: unknown[];
  vehicleId?: string;
  licenseNumber: string;
  licenseExpiry: string;
  vehicle?: { name: string; plateNumber: string };
  createdAt: string;
}

interface DriversResponse {
  drivers: Driver[];
  pagination: { total: number; page: number; pages: number };
}

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

const STATUS_OPTIONS: { label: string; value: Driver["status"]; tone: "success" | "muted" | "warning" | "danger" }[] = [
  { label: "Active", value: "active", tone: "success" },
  { label: "Inactive", value: "inactive", tone: "muted" },
  { label: "On Break", value: "on_break", tone: "warning" },
  { label: "Off Duty", value: "off_duty", tone: "danger" },
];

const EMPLOYMENT_OPTIONS: { label: string; value: NonNullable<Driver["employmentType"]> }[] = [
  { label: "Full time", value: "full_time" },
  { label: "Contract", value: "contract" },
  { label: "Part time", value: "part_time" },
];

type ToastState = { message: string; tone: "success" | "error" } | null;

export default function DriversPage() {
  const { data, isLoading, error } = useSWR<DriversResponse>(
    "/api/drivers",
    fetcher,
    { refreshInterval: 10000 }
  );

  const [showModal, setShowModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const isEditing = !!editingDriver;
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    status: "inactive" as Driver["status"],
    employeeId: "",
    employmentType: "full_time" as NonNullable<Driver["employmentType"]>,
    vehicleId: "",
    licenseNumber: "",
    licenseExpiry: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Driver | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<Driver[] | null>(null);

  const statusChips = useMemo(() => {
    const map: Record<Driver["status"], { label: string; tone: "success" | "muted" | "warning" | "danger" }> = {
      active: { label: "Active", tone: "success" },
      inactive: { label: "Inactive", tone: "muted" },
      on_break: { label: "On Break", tone: "warning" },
      off_duty: { label: "Off Duty", tone: "danger" },
    };
    return map;
  }, []);

  const columns = useMemo<GridColumn<Driver>[]>(() => [
    {
      id: "name",
      header: "Name",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
      sortValue: (row) => row.name,
      exportValue: (row) => row.name,
      minWidth: "200px",
    },
    {
      id: "phone",
      header: "Phone",
      accessor: (row) => row.phone,
      sortValue: (row) => row.phone,
      exportValue: (row) => row.phone,
      minWidth: "140px",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <Badge variant={statusChips[row.status]?.tone || "muted"}>
          {statusChips[row.status]?.label || row.status.replace("_", " ")}
        </Badge>
      ),
      sortValue: (row) => row.status,
      exportValue: (row) => row.status,
      minWidth: "120px",
    },
    {
      id: "license",
      header: "License #",
      accessor: (row) => row.licenseNumber,
      sortValue: (row) => row.licenseNumber,
      exportValue: (row) => row.licenseNumber,
      minWidth: "140px",
    },
    {
      id: "vehicle",
      header: "Vehicle",
      accessor: (row) => row.vehicle?.name || row.vehicle?.plateNumber || "--",
      exportValue: (row) => row.vehicle?.name || row.vehicle?.plateNumber || "",
      minWidth: "160px",
    },
    {
      id: "created",
      header: "Created",
      accessor: (row) => new Date(row.createdAt).toLocaleDateString(),
      sortValue: (row) => new Date(row.createdAt).getTime(),
      exportValue: (row) => row.createdAt,
      minWidth: "140px",
      align: "right",
    },
  ], [statusChips]);

  const filters = useMemo<GridFilter<Driver>[]>(() => [
    {
      id: "status",
      label: "Status",
      placeholder: "All statuses",
      options: STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
      predicate: (row, value) => row.status === value,
    },
  ], []);

  const showToast = (message: string, tone: NonNullable<ToastState>["tone"]) => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  };

  const openCreateModal = () => {
    setEditingDriver(null);
    setFormData({
      name: "",
      email: "",
      phone: "",
      status: "inactive",
      employeeId: "",
      employmentType: "full_time",
      vehicleId: "",
      licenseNumber: "",
      licenseExpiry: "",
    });
    setShowModal(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      name: driver.name,
      email: driver.email,
      phone: driver.phone,
      status: driver.status,
      employeeId: driver.employeeId || "",
      employmentType: driver.employmentType || "full_time",
      vehicleId: driver.vehicleId || "",
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry?.split("T")[0] || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId || undefined,
        employmentType: formData.employmentType,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry,
      };

      if (isEditing) {
        Object.assign(payload, {
          status: formData.status,
          vehicle: formData.vehicleId || undefined,
        });
      }

      const url = editingDriver ? `/api/drivers/${editingDriver._id}` : "/api/drivers";
      const method = editingDriver ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save driver");
      }

      mutate("/api/drivers");
      setShowModal(false);
      showToast(editingDriver ? "Driver updated" : "Driver created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteDriver = async (driver: Driver) => {
    try {
      const res = await fetch(`/api/drivers/${driver._id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete driver");
      mutate("/api/drivers");
      showToast("Driver deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    }
  };

  const deleteBulkDrivers = async (rows: Driver[]) => {
    if (!rows.length) return;
    setBulkDeleting(true);
    try {
      const responses = await Promise.all(
        rows.map((driver) =>
          fetch(`/api/drivers/${driver._id}`, { method: "DELETE", credentials: "include" })
        )
      );
      const failed = responses.find((res) => !res.ok);
      if (failed) throw new Error("One or more deletions failed");
      mutate("/api/drivers");
      showToast("Drivers deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const renderRowActions = (driver: Driver) => (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="ghost" asChild>
        <a href={`/drivers/${driver._id}`}>View</a>
      </Button>
      <Button size="sm" variant="ghost" onClick={() => openEditModal(driver)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600"
        onClick={() => setPendingDelete(driver)}
      >
        Delete
      </Button>
    </div>
  );

  const searchKeys: (keyof Driver | string)[] = [
    "name",
    "email",
    "phone",
    "licenseNumber",
    "vehicle.name",
    "vehicle.plateNumber",
    "status",
  ];

  const selectedStatus = formData.status;
  const selectedEmployment = formData.employmentType;
  const activeCount = useMemo(() => data?.drivers?.filter((d) => d.status === "active").length ?? 0, [data]);

  return (
    <AppShell>
      <ListPageLayout
        title="Drivers"
        description="Manage your fleet drivers and their assignments."
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            Add Driver
          </Button>
        }
        stats={
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total drivers</p>
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
          title="Drivers"
          description="Search, filter, and export driver activity."
          data={data?.drivers ?? []}
          columns={columns}
          keyField="_id"
          searchKeys={searchKeys}
          filters={filters}
          isLoading={isLoading}
          error={error ? "Failed to load drivers." : null}
          emptyText="No drivers found. Add your first driver to get started."
          selectable
          bulkActions={[
            {
              label: bulkDeleting ? "Deleting..." : "Delete Selected",
              disabledLabel: "Delete Selected",
              onClick: (rows) => setPendingBulkDelete(rows),
            },
          ]}
          enableCsvExport
          csvFileName="drivers.csv"
          onAdd={openCreateModal}
          addLabel="Add Driver"
          renderRowActions={renderRowActions}
          actionsLabel="Actions"
        />
      </ListPageLayout>

        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-7xl">
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Add New Driver"}</DialogTitle>
              <DialogDescription>Capture driver identity and compliance details.</DialogDescription>
            </DialogHeader>
            <form id="driver-form" onSubmit={handleSubmit} className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 no-scrollbar">
              <Input
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {isEditing && (
                <LabeledSelect
                  label="Status"
                  value={selectedStatus}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Driver["status"] })}
                  options={STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
                />
              )}
              <LabeledSelect
                label="Employment Type"
                value={selectedEmployment}
                onValueChange={(value) => setFormData({ ...formData, employmentType: value as NonNullable<Driver["employmentType"]> })}
                options={EMPLOYMENT_OPTIONS}
              />
              <Input
                label="Employee ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              />
              {isEditing && (
                <Input
                  label="Vehicle ID"
                  value={formData.vehicleId}
                  onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                />
              )}
              <Input
                label="License Number"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                required
              />
              <Input
                label="License Expiry"
                type="date"
                value={formData.licenseExpiry}
                onChange={(e) => setFormData({ ...formData, licenseExpiry: e.target.value })}
                required
              />
            </form>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} radius="sm">
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                form="driver-form"
                radius="sm"
                disabled={submitting}
              >
                {submitting ? "Saving..." : editingDriver ? "Update" : "Create"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      {toast ? <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} /> : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete driver"
        description={pendingDelete ? `Remove ${pendingDelete.name} from your fleet? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteDriver(pendingDelete);
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(null);
        }}
        title="Delete selected drivers"
        description={
          pendingBulkDelete
            ? `Delete ${pendingBulkDelete.length} driver${pendingBulkDelete.length > 1 ? "s" : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel={bulkDeleting ? "Deleting..." : "Delete"}
        onConfirm={() => {
          if (pendingBulkDelete) {
            void deleteBulkDrivers(pendingBulkDelete);
            setPendingBulkDelete(null);
          }
        }}
      />
    </AppShell>
  );
}
