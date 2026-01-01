"use client";

import { useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import { ListPageLayout } from "@/components/layout/ListPageLayout";
import { DataGrid, GridColumn, GridFilter } from "@/components/ui/data-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LabeledSelect } from "@/components/ui/labeled-select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Toast, ToastTone } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface User {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "dispatcher" | "manager";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  users: User[];
  pagination: { total: number; page: number; pages: number };
}

type ToastState = { message: string; tone: ToastTone } | null;

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((res) => res.json());

const ROLE_OPTIONS = [
  { label: "Dispatcher", value: "dispatcher" },
  { label: "Manager", value: "manager" },
  { label: "Admin", value: "admin" },
];

export default function UsersPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === "admin";
  const { data, isLoading, error } = useSWR<UsersResponse>(isAdmin ? "/api/users" : null, fetcher, {
    refreshInterval: 10000,
  });

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "dispatcher" as User["role"],
  });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState<User[] | null>(null);

  const showToast = (message: string, tone: ToastTone = "info") => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 2600);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "dispatcher" });
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, password: "", role: user.role });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingUser ? `/api/users/${editingUser._id}` : "/api/users";
      const method = editingUser ? "PUT" : "POST";
      const payload = editingUser
        ? { name: formData.name, email: formData.email, role: formData.role }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save user");
      }

      mutate('/api/users');
      setShowModal(false);
      showToast(editingUser ? "User updated" : "User created", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteUser = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user._id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete user");
      mutate('/api/users');
      showToast("User deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    }
  };

  const deleteBulkUsers = async (rows: User[]) => {
    if (!rows.length) return;
    setBulkDeleting(true);
    try {
      const responses = await Promise.all(
        rows.map((user) => fetch(`/api/users/${user._id}`, { method: "DELETE", credentials: "include" }))
      );
      const failed = responses.find((res) => !res.ok);
      if (failed) throw new Error("One or more deletions failed");
      mutate('/api/users');
      showToast("Users deleted", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "An error occurred", "error");
    } finally {
      setBulkDeleting(false);
    }
  };

  const columns = useMemo<GridColumn<User>[]>(() => [
    {
      id: "user",
      header: "User",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/60 text-sm font-semibold text-foreground">
            {row.avatar ? <img src={row.avatar} alt={row.name} className="h-9 w-9 rounded-full object-cover" /> : row.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-foreground">{row.name}</p>
            <p className="text-xs text-muted-foreground">{row.email}</p>
          </div>
        </div>
      ),
      sortValue: (row) => row.name,
      exportValue: (row) => row.name,
      minWidth: "220px",
    },
    {
      id: "role",
      header: "Role",
      accessor: (row) => <Badge variant="muted">{row.role}</Badge>,
      sortValue: (row) => row.role,
      exportValue: (row) => row.role,
      minWidth: "120px",
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
  ], []);

  const filters = useMemo<GridFilter<User>[]>(() => [
    {
      id: "role",
      label: "Role",
      placeholder: "All roles",
      options: ROLE_OPTIONS,
      predicate: (row, value) => row.role === value,
    },
  ], []);

  const searchKeys: (keyof User | string)[] = ["name", "email", "role"];

  const adminCount = useMemo(() => (
    data?.users?.filter((user) => user.role === "admin").length ?? 0
  ), [data]);

  const renderRowActions = (user: User) => (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" variant="ghost" onClick={() => openEditModal(user)}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setPendingDelete(user)}>
        Delete
      </Button>
    </div>
  );

  return (
    <AppShell>
      {status === "loading" ? (
        <div className="text-sm text-muted-foreground">Loading access...</div>
      ) : !isAdmin ? (
        <div className="rounded-2xl border border-border bg-card/80 p-6 text-sm text-muted-foreground">
          You don&apos;t have permission to view users. Please contact an admin.
        </div>
      ) : (
      <ListPageLayout
        title="Users"
        description="Manage system users and their access permissions."
        actions={
          <Button variant="primary" size="sm" onClick={openCreateModal}>
            Add User
          </Button>
        }
        stats={
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total users</p>
                  <p className="text-2xl font-semibold">{data?.pagination?.total ?? "--"}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>

            <Card className="border-border bg-background/70">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admins</p>
                  <p className="text-2xl font-semibold">{adminCount}</p>
                </div>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardHeader>
            </Card>
          </div>
        }
      >
        <DataGrid
          title="Users"
          description="Search, filter, and export user access."
          data={data?.users ?? []}
          columns={columns}
          keyField="_id"
          searchKeys={searchKeys}
          filters={filters}
          isLoading={isLoading}
          error={error ? "Failed to load users." : null}
          emptyText="No users found. Add your first user to get started."
          selectable
          bulkActions={[
            {
              label: bulkDeleting ? "Deleting..." : "Delete Selected",
              disabledLabel: "Delete Selected",
              onClick: (rows) => setPendingBulkDelete(rows),
            },
          ]}
          enableCsvExport
          csvFileName="users.csv"
          addLabel="Add User"
          renderRowActions={renderRowActions}
          actionsLabel="Actions"
        />
      </ListPageLayout>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>Control user access and roles.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3" id="user-form">
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
            {!editingUser ? (
              <Input
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            ) : null}
            <LabeledSelect
              label="Role"
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value as User["role"] })}
              options={ROLE_OPTIONS}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowModal(false)} radius="sm" type="button">
                Cancel
              </Button>
              <Button variant="primary" type="submit" radius="sm" disabled={submitting} form="user-form">
                {submitting ? "Saving..." : editingUser ? "Update" : "Create"}
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
        title="Delete user"
        description={pendingDelete ? `Delete ${pendingDelete.name}? This cannot be undone.` : ""}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            void deleteUser(pendingDelete);
            setPendingDelete(null);
          }
        }}
      />

      <ConfirmDialog
        open={!!pendingBulkDelete}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDelete(null);
        }}
        title="Delete selected users"
        description={
          pendingBulkDelete
            ? `Delete ${pendingBulkDelete.length} user${pendingBulkDelete.length > 1 ? "s" : ""}? This cannot be undone.`
            : ""
        }
        confirmLabel={bulkDeleting ? "Deleting..." : "Delete"}
        onConfirm={() => {
          if (pendingBulkDelete) {
            void deleteBulkUsers(pendingBulkDelete);
            setPendingBulkDelete(null);
          }
        }}
      />
    </AppShell>
  );
}
