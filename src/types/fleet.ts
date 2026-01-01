export type DriverStatus = "online" | "offline" | "busy";

export interface Driver {
  id: string;
  name: string;
  phone: string;
  status: DriverStatus;
  vehicleId?: string;
  deliveriesToday: number;
  lat?: number;
  lng?: number;
}

export interface Vehicle {
  id: string;
  label: string;
  plateNumber: string;
}
