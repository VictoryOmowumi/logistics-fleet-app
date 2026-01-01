import type { Order, OrderStatus, OrderPriority } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  const callback = encodeURIComponent(`${window.location.pathname}${window.location.search}` || '/');
  window.location.href = `/auth/login?callbackUrl=${callback}`;
}

// API response types
interface APIOrder {
  _id: string;
  orderNumber: string;
  status: OrderStatus;
  customer?: { name: string; email?: string; phone?: string };
  pickup?: { address: string; city: string; scheduledTime?: string };
  delivery?: { address: string; city: string };
  assignedDriver?: { _id: string; name: string };
  priority?: OrderPriority;
}

// Input types for creating/updating orders
interface CreateOrderInput {
  customer: { name: string; email?: string; phone: string };
  pickup: { address: string; city: string; state: string; zipCode: string; scheduledTime?: string };
  delivery: { address: string; city: string; state: string; zipCode: string };
  items: { description: string; quantity: number; weight?: number }[];
  priority?: OrderPriority;
}

interface UpdateOrderInput {
  status?: OrderStatus;
  assignedDriver?: string;
  assignedVehicle?: string;
  priority?: OrderPriority;
}

/**
 * Fetch all orders from our API
 */
export async function getOrders(filters?: {
  status?: string;
  driverId?: string;
  priority?: string;
}): Promise<Order[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.driverId) params.set('driverId', filters.driverId);
    if (filters?.priority) params.set('priority', filters.priority);

    const url = `${API_BASE}/api/orders${params.toString() ? `?${params}` : ''}`;
    
    const res = await fetch(url, {
      cache: 'no-store',
      credentials: 'include',
    });

    if (res.status === 401) {
      redirectToLogin();
      return [];
    }

    if (!res.ok) {
      console.error('[OrderService] Failed to fetch orders:', res.status);
      return [];
    }

    const data = await res.json();
    
    return (data.orders || []).map((order: APIOrder) => ({
      id: order._id,
      internal_id: order.orderNumber,
      status: order.status,
      customer: order.customer?.name,
      pickup: `${order.pickup?.address || ''}, ${order.pickup?.city || ''}`,
      dropoff: `${order.delivery?.address || ''}, ${order.delivery?.city || ''}`,
      driver_id: order.assignedDriver?._id,
      driver_name: order.assignedDriver?.name,
      scheduled_at: order.pickup?.scheduledTime,
      priority: order.priority,
    }));
  } catch (error) {
    console.error("❌ Failed to fetch orders:", error);
    return [];
  }
}

/**
 * Fetch a single order by ID
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      cache: 'no-store',
      credentials: 'include',
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) {
      return null;
    }

    const order: APIOrder = await res.json();
    
    return {
      id: order._id,
      internal_id: order.orderNumber,
      status: order.status,
      customer: order.customer?.name,
      pickup: `${order.pickup?.address || ''}, ${order.pickup?.city || ''}`,
      dropoff: `${order.delivery?.address || ''}, ${order.delivery?.city || ''}`,
      driver_id: order.assignedDriver?._id,
      driver_name: order.assignedDriver?.name,
      scheduled_at: order.pickup?.scheduledTime,
      priority: order.priority,
    };
  } catch (error) {
    console.error("❌ Failed to fetch order:", error);
    return null;
  }
}

/**
 * Create a new order
 */
export async function createOrder(orderData: CreateOrderInput): Promise<Order | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      credentials: 'include',
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create order');
    }

    return await res.json();
  } catch (error) {
    console.error("❌ Failed to create order:", error);
    return null;
  }
}

/**
 * Update an order
 */
export async function updateOrder(orderId: string, updates: UpdateOrderInput): Promise<Order | null> {
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
      credentials: 'include',
    });

    if (res.status === 401) {
      redirectToLogin();
      return null;
    }

    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update order');
    }

    return await res.json();
  } catch (error) {
    console.error("❌ Failed to update order:", error);
    return null;
  }
}

// Backwards-compatible object export
export const OrderService = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
};
