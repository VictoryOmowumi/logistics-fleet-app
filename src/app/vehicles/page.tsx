"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { DataGrid, GridColumn, GridFilter } from "@/components/ui/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toast, ToastTone } from "@/components/ui/toast";
import { Card, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
interface Vehicle {
  _id: string;
  name: string;
  plateNumber: string;
  type: "truck" | "van" | "trailer" | "pickup";
  status: "available" | "in_use" | "maintenance" | "retired";
  capacity: number;
  capacityUsed?: number;
  fuelType: "diesel" | "gasoline" | "electric" | "hybrid";
  mileage: number;
  odometer?: number;
  fuelLevel?: number;
  healthStatus?: "good" | "warning" | "critical";
  vin?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  lastServiceDate?: string;
  nextServiceDue?: string;
  lastSyncedAt?: string;
  assignedDriverId?: string;
  maintenanceHistory?: unknown[];
  assignedDriver?: { name: string };
  createdAt: string;
}

interface VehiclesResponse {
  vehicles: Vehicle[];
  pagination: { total: number; page: number; pages: number };
}

type ToastState = { message: string; tone: ToastTone } | null;

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((res) => res.json());

const STATUS_OPTIONS: { label: string; value: Vehicle["status"]; tone: "success" | "muted" | "warning" | "danger" }[] = [
  { label: "Available", value: "available", tone: "success" },
  { label: "In Use", value: "in_use", tone: "muted" },
  { label: "Maintenance", value: "maintenance", tone: "warning" },
  { label: "Retired", value: "retired", tone: "danger" },
];

const TYPE_OPTIONS: { label: string; value: Vehicle["type"] }[] = [
  { label: "Truck", value: "truck" },
  { label: "Van", value: "van" },
  { label: "Trailer", value: "trailer" },
  { label: "Pickup", value: "pickup" },
];

export default function VehiclesPage() {
  const { data, isLoading, error } = useSWR<VehiclesResponse>('/api/vehicles', fetcher, {
    refreshInterval: 10000,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const isEditing = !!editingVehicle;
  const [formData, setFormData] = useState({
    name: "",
    plateNumber: "",
    type: "truck" as Vehicle["type"],
    status: "available" as Vehicle["status"],
    capacity: 1000,
    fuelType: "diesel" as Vehicle["fuelType"],
    vin: "",
    make: "",
    model: "",
    year: "",
    color: "",
    lastServiceDate: "",
    nextServiceDue: "",
    assignedDriverId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Vehicle | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<Vehicle[] | null>(null);

  const statusChips = useMemo(() => {
    const map: Record<Vehicle["status"], { label: string; tone: "success" | "muted" | "warning" | "danger" }> = {
      available: { label: "Available", tone: "success" },
      in_use: { label: "In Use", tone: "muted" },
      maintenance: { label: "Maintenance", tone: "warning" },
      retired: { label: "Retired", tone: "danger" },
    };
    return map;
  }, []);

  const columns = useMemo<GridColumn<Vehicle>[]>(() => [
    {
      id: "vehicle",
      header: "Vehicle",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-foreground">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.plateNumber}</p>
        </div>
      ),
      sortValue: (row) => row.name,
      exportValue: (row) => row.name,
      minWidth: "200px",
    },
    {
      id: "type",
      header: "Type",
      accessor: (row) => row.type,
      sortValue: (row) => row.type,
      exportValue: (row) => row.type,
      minWidth: "120px",
    },
    {
      id: "status",
      header: "Status",
      accessor: (row) => (
        <Badge variant={statusChips[row.status]?.tone || "muted"}>
          {statusChips[row.status]?.label || row.status}
        </Badge>
      ),
      sortValue: (row) => row.status,
      exportValue: (row) => row.status,
      minWidth: "140px",
    },
    {
      id: "capacity",
      header: "Capacity (kg)",
      accessor: (row) => row.capacity.toLocaleString(),
      sortValue: (row) => row.capacity,
      exportValue: (row) => row.capacity,
      minWidth: "140px",
      align: "right",
    },
    {
      id: "mileage",
      header: "Mileage (km)",
      accessor: (row) => row.mileage.toLocaleString(),
      sortValue: (row) => row.mileage,
      exportValue: (row) => row.mileage,
      minWidth: "140px",
      align: "right",
    },
    {
      id: "driver",
      header: "Assigned Driver",
      accessor: (row) => row.assignedDriver?.name || "--",
      exportValue: (row) => row.assignedDriver?.name || "",
      minWidth: "160px",
    },
    {
      id: "service",
      header: "Next Service",
      accessor: (row) => row.nextServiceDue ? new Date(row.nextServiceDue).toLocaleDateString() : "--",
      sortValue: (row) => row.nextServiceDue ? new Date(row.nextServiceDue).getTime() : 0,
      exportValue: (row) => row.nextServiceDue || "",
      minWidth: "140px",
      align: "right",
    },
  ], [statusChips]);

  const filters = useMemo<GridFilter<Vehicle>[]>(() => [
    {
      id: "status",
      label: "Status",
      placeholder: "All statuses",
      options: STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value })),
      predicate: (row, value) => row.status === value,
    },
    {
      id: "type",
      label: "Type",
      placeholder: "All types",
      options: TYPE_OPTIONS,
      predicate: (row, value) => row.type === value,
    },
  ], []);

  const searchKeys: (keyof Vehicle | string)[] = [
    "name",
    "plateNumber",
    "type",
    "status",
    "assignedDriver.name",
    "fuelType",
  ];

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  };

  const openCreateModal = () => {
    setEditingVehicle(null);
    setFormData({
      name: "",
      plateNumber: "",
      type: "truck",
      status: "available",
      capacity: 1000,
      fuelType: "diesel",
      vin: "",
      make: "",
      model: "",
      year: "",
      color: "",
      lastServiceDate: "",
      nextServiceDue: "",
      assignedDriverId: "",
    });
    setShowModal(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      type: vehicle.type,
      status: vehicle.status,
      capacity: vehicle.capacity,
      fuelType: vehicle.fuelType,
      vin: vehicle.vin || "",
      make: vehicle.make || "",
      model: vehicle.model || "",
      year: vehicle.year?.toString() || "",
      color: vehicle.color || "",
      lastServiceDate: vehicle.lastServiceDate?.split("T")[0] || "",
      nextServiceDue: vehicle.nextServiceDue?.split("T")[0] || "",
      assignedDriverId: vehicle.assignedDriverId || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        plateNumber: formData.plateNumber,
        type: formData.type,
        capacity: formData.capacity,
        fuelType: formData.fuelType,
        vin: formData.vin || undefined,
        make: formData.make || undefined,
        model: formData.model || undefined,
        year: parseNumber(formData.year),
        color: formData.color || undefined,
        lastServiceDate: formData.lastServiceDate || undefined,
        nextServiceDue: formData.nextServiceDue || undefined,
      };

      if (isEditing) {
        Object.assign(payload, {
          status: formData.status,
          assignedDriver: formData.assignedDriverId || undefined,
        });
      }

      const url = editingVehicle ? `/api/vehicles/${editingVehicle._id}` : "/api/vehicles";
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save vehicle");
      }

      mutate('/api/vehicles');
      setShowModal(false);
      showToast(editingVehicle ? "Vehicle updated" : "Vehicle created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteVehicle = async (vehicle: Vehicle) => {
    try {
      const res = await fetch(`/api/vehicles/${vehicle._id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
      mutate('/api/vehicles');
      showToast("Vehicle deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    }
  };

  const deleteBulkVehicles = async (rows: Vehicle[]) => {
    if (!rows.length) return;
    setBulkDeleting(true);
    try {
      const responses = await Promise.all(
        rows.map((vehicle) => fetch(`/api/vehicles/${vehicle._id}`, { method: "DELETE", credentials: "include" }))
      );
      const failed = responses.find((res) => !res.ok);
      if (failed) throw new Error("One or more deletions failed");
      mutate('/api/vehicles');
      showToast("Vehicles deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const renderRowActions = (vehicle: Vehicle) => (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="ghost" asChild>
        <a href={`/vehicles/${vehicle._id}`}>View</a>
      </Button>
      <Button size="sm" variant="ghost" onClick={() => openEditModal(vehicle)}>
        Edit
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="text-red-600"
        onClick={() => setPendingDelete(vehicle)}
      >
        Delete
      </Button>
    </div>
  );

  const parseNumber = (value: string) => {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  return (
    <AppShell>
      <ListPageLayout
        title="Vehicles"
        description="Manage your fleet vehicles and maintenance schedules."
        actions={
          <Button variant="primary" onClick={openCreateModal} size="sm">
            Add Vehicle
          </Button>
        }
        stats={
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total vehicles</p>
                  <p className="text-2xl font-semibold">{data?.pagination?.total ?? "--"}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>

            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Available</p>
                  <p className="text-2xl font-semibold">
                    {data?.vehicles?.filter((v) => v.status === "available").length ?? 0}
                  </p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>
          </div>
        }
      >
        <DataGrid
          title="Vehicles"
          description="Search, filter, and export fleet assets."
          data={data?.vehicles ?? []}
          columns={columns}
          keyField="_id"
          searchKeys={searchKeys}
          filters={filters}
          isLoading={isLoading}
          error={error ? "Failed to load vehicles." : null}
          emptyText="No vehicles found. Add your first vehicle to get started."
          selectable
          bulkActions={[
            {
              label: bulkDeleting ? "Deleting..." : "Delete Selected",
              disabledLabel: "Delete Selected",
              onClick: (rows) => setPendingBulkDelete(rows),
            },
          ]}
          enableCsvExport
          csvFileName="vehicles.csv"
          addLabel="Add Vehicle"
          renderRowActions={renderRowActions}
          actionsLabel="Actions"
        />
      </ListPageLayout>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-7xl">
          <DialogHeader>
            <DialogTitle>{editingVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
            <DialogDescription>Capture vehicle details, capacity, and service windows.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto p-1 no-scrollbar" id="vehicle-form">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <Input
              label="Plate Number"
              value={formData.plateNumber}
              onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value.toUpperCase() })}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="VIN"
                value={formData.vin}
                onChange={(e) => setFormData({ ...formData, vin: e.target.value })}
              />
              {isEditing && (
                <Input
                  label="Assigned Driver ID"
                  value={formData.assignedDriverId}
                  onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <LabeledSelect
                label="Type"
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as Vehicle["type"] })}
                options={TYPE_OPTIONS}
              />
              {isEditing && (
                <LabeledSelect
                  label="Status"
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as Vehicle["status"] })}
                  options={STATUS_OPTIONS.map((opt) => ({ label: opt.label, value: opt.value }))}
                />
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Capacity (kg)"
                type="number"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })}
                required
              />
              <LabeledSelect
                label="Fuel Type"
                value={formData.fuelType}
                onValueChange={(value) => setFormData({ ...formData, fuelType: value as Vehicle["fuelType"] })}
                options={[
                  { label: "Diesel", value: "diesel" },
                  { label: "Gasoline", value: "gasoline" },
                  { label: "Electric", value: "electric" },
                  { label: "Hybrid", value: "hybrid" },
                ]}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Make"
                value={formData.make}
                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
              />
              <Input
                label="Model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
              <Input
                label="Color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Last Service"
                type="date"
                value={formData.lastServiceDate}
                onChange={(e) => setFormData({ ...formData, lastServiceDate: e.target.value })}
              />
              <Input
                label="Next Service Due"
                type="date"
                value={formData.nextServiceDue}
                onChange={(e) => setFormData({ ...formData, nextServiceDue: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} radius="sm" type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" radius="sm" disabled={submitting} form="vehicle-form">
                {submitting ? "Saving..." : editingVehicle ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {toast ? (
        <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete vehicle"
        description={pendingDelete ? `Remove ${pendingDelete.name} from the fleet? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteVehicle(pendingDelete);
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(null);
        }}
        title="Delete selected vehicles"
        description={
          pendingBulkDelete
            ? `Delete ${pendingBulkDelete.length} vehicle${pendingBulkDelete.length > 1 ? "s" : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel={bulkDeleting ? "Deleting..." : "Delete"}
        onConfirm={() => {
          if (pendingBulkDelete) {
            void deleteBulkVehicles(pendingBulkDelete);
            setPendingBulkDelete(null);
          }
        }}
      />
    </AppShell>
  );
}
