export interface FleetbaseCoordinates {
  type: "Point";
  // [longitude, latitude]
  coordinates: [number, number];
}

export interface Driver {
  id: string;
  name: string;
  phone?: string;
  status: "active" | "inactive" | "busy" | "on_break" | "off_duty";
  location?: FleetbaseCoordinates;
  vehicle?: string; // Vehicle ID
  jobCount?: number; // Often calculated client-side
}

export interface Vehicle {
  id: string;
  name: string;
  plate_number: string;
  type?: string;
  status?: string;
}

// Re-export Order types from order.ts
export type { Order, OrderStatus, OrderPriority } from './order';
