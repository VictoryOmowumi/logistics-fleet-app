export type OrderStatus = 
  | "pending" 
  | "assigned" 
  | "picked_up" 
  | "in_transit" 
  | "delivered" 
  | "cancelled";

export type OrderPriority = "low" | "medium" | "high" | "urgent";

export interface Order {
  id: string;
  internal_id?: string;
  status: OrderStatus;
  customer?: string;
  pickup?: string;
  dropoff?: string;
  driver_id?: string;
  driver_name?: string;
  scheduled_at?: string;
  priority?: OrderPriority;
  createdAt?: string;
}
