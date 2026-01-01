import type { Driver, Vehicle, FleetbaseCoordinates } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const callback = encodeURIComponent(`${window.location.pathname}${window.location.search}` || "/");
  window.location.href = `/auth/login?callbackUrl=${callback}`;
}

interface APIDriver {
  _id: string;
  name: string;
  phone: string;
  status: string;
  location?: FleetbaseCoordinates;
  vehicle?: { name: string; plateNumber: string };
  jobCount?: number;
}

interface APIVehicle {
  _id: string;
  name: string;
  plateNumber: string;
  type: string;
  status: string;
}

export async function getDrivers(): Promise<Driver[]> {
  try {
    const res = await fetch(`${API_BASE}/api/drivers`, {
      cache: "no-store",
      credentials: "include",
    });
    if (res.status === 401) {
      redirectToLogin();
      return [];
    }
    if (!res.ok) {
      console.error("[FleetService] Failed to fetch drivers:", res.status);
      return [];
    }
    const data = await res.json();
    return (data.drivers ?? []).map((driver: APIDriver) => ({
      id: driver._id,
      name: driver.name,
      phone: driver.phone,
      status: driver.status as Driver["status"],
      location: driver.location,
      vehicle: driver.vehicle?.name ?? driver.vehicle?.plateNumber,
      jobCount: driver.jobCount,
    }));
  } catch (error) {
    console.error("[FleetService] Failed to fetch drivers:", error);
    return [];
  }
}

export async function getDriverLocation(driverId: string): Promise<FleetbaseCoordinates | null> {
  try {
    const res = await fetch(`${API_BASE}/api/drivers/${driverId}/location`, {
      cache: "no-store",
      credentials: "include",
    });
    if (res.status === 401) {
      redirectToLogin();
      return null;
    }
    if (!res.ok) return null;
    const data = await res.json();
    return (data.location as FleetbaseCoordinates) ?? null;
  } catch (error) {
    console.error("[FleetService] Failed to fetch driver location:", error);
    return null;
  }
}

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const res = await fetch(`${API_BASE}/api/vehicles`, {
      cache: "no-store",
      credentials: "include",
    });
    if (res.status === 401) {
      redirectToLogin();
      return [];
    }
    if (!res.ok) {
      console.error("[FleetService] Failed to fetch vehicles:", res.status);
      return [];
    }
    const data = await res.json();
    return (data.vehicles ?? []).map((vehicle: APIVehicle) => ({
      id: vehicle._id,
      name: vehicle.name,
      plate_number: vehicle.plateNumber,
      type: vehicle.type,
      status: vehicle.status,
    }));
  } catch (error) {
    console.error("[FleetService] Failed to fetch vehicles:", error);
    return [];
  }
}

export const FleetService = {
  getDrivers,
  getDriverLocation,
  getVehicles,
};
