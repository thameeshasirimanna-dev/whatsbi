import { getToken } from './auth';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Orders API
export interface OrderItem {
  order_id?: number;
  name: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: number;
  customer_id: number;
  agent_id?: number;
  customer_name?: string;
  customer_phone?: string;
  total_amount: number;
  status: "pending" | "processing" | "shipped" | "completed" | "delivered" | "cancelled";
  notes?: string;
  order_details?: string;
  shipping_address?: string;
  created_at: string;
  updated_at?: string;
  parsed_order_details?: any;
  type?: "order";
  customer?: {
    id: number;
    name: string;
    phone: string;
  };
  order_items?: OrderItem[];
}

export const getOrders = async (params?: {
  customer_id?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Order[]> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const url = new URL(`${BACKEND_URL}/manage-orders`);
    if (params?.customer_id) url.searchParams.set('customer_id', params.customer_id.toString());
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch orders');
    }

    return data.orders || [];
  } catch (err) {
    console.error('Get orders error:', err);
    throw err;
  }
};

export const createOrder = async (orderData: {
  customer_id: number;
  notes?: string;
  shipping_address?: string;
  items: OrderItem[];
}): Promise<Order> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create order');
    }

    return data.order;
  } catch (err) {
    console.error('Create order error:', err);
    throw err;
  }
};

export const updateOrder = async (orderData: {
  id: number;
  status?: string;
  notes?: string;
  shipping_address?: string;
}): Promise<Order> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-orders`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update order');
    }

    return data.order;
  } catch (err) {
    console.error('Update order error:', err);
    throw err;
  }
};

export const deleteOrder = async (id: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-orders?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete order');
    }
  } catch (err) {
    console.error('Delete order error:', err);
    throw err;
  }
};

// Invoices API
export interface Invoice {
  id: number;
  order_id: number;
  name: string;
  pdf_url: string;
  status: string;
  generated_at: string;
  customer_id?: number;
  customer_name?: string;
  order_number?: string;
  total?: number;
}

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-invoices`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch invoices');
    }

    return data.invoices || [];
  } catch (err) {
    console.error('Get invoices error:', err);
    throw err;
  }
};

export const updateInvoiceStatus = async (id: number, status: string): Promise<Invoice> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-invoices`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id, status }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update invoice');
    }

    return data.invoice;
  } catch (err) {
    console.error('Update invoice error:', err);
    throw err;
  }
};

export const deleteInvoice = async (id: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-invoices?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete invoice');
    }
  } catch (err) {
    console.error('Delete invoice error:', err);
    throw err;
  }
};

// Appointments API
export interface Appointment {
  id: number;
  customer_id: number;
  title: string;
  appointment_date: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  created_at: string;
  updated_at?: string;
}

export const getAppointments = async (params?: {
  customer_id?: number;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Appointment[]> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const url = new URL(`${BACKEND_URL}/manage-appointments`);
    if (params?.customer_id) url.searchParams.set('customer_id', params.customer_id.toString());
    if (params?.status) url.searchParams.set('status', params.status);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch appointments');
    }

    return data.appointments || [];
  } catch (err) {
    console.error('Get appointments error:', err);
    throw err;
  }
};

export const createAppointment = async (appointmentData: {
  customer_id: number;
  title: string;
  appointment_date: string;
  duration_minutes?: number;
  notes?: string;
}): Promise<Appointment> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create appointment');
    }

    return data.appointment;
  } catch (err) {
    console.error('Create appointment error:', err);
    throw err;
  }
};

export const updateAppointment = async (appointmentData: {
  id: number;
  title?: string;
  appointment_date?: string;
  duration_minutes?: number;
  status?: string;
  notes?: string;
}): Promise<Appointment> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-appointments`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(appointmentData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update appointment');
    }

    return data.appointment;
  } catch (err) {
    console.error('Update appointment error:', err);
    throw err;
  }
};

export const deleteAppointment = async (id: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-appointments?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete appointment');
    }
  } catch (err) {
    console.error('Delete appointment error:', err);
    throw err;
  }
};

// Customers API
export interface Customer {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  lead_stage: string;
  interest_stage?: string;
  conversion_stage?: string;
  language: string;
  ai_enabled: boolean;
  profile_image?: string;
  last_user_message_time: string;
  created_at: string;
  updated_at?: string;
  order_count?: number;
}

export const getCustomers = async (params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Customer[]> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const url = new URL(`${BACKEND_URL}/manage-customers`);
    if (params?.search) url.searchParams.set('search', params.search);
    if (params?.limit) url.searchParams.set('limit', params.limit.toString());
    if (params?.offset) url.searchParams.set('offset', params.offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch customers');
    }

    return data.customers || [];
  } catch (err) {
    console.error('Get customers error:', err);
    throw err;
  }
};

export const createCustomer = async (customerData: {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  lead_stage?: string;
  interest_stage?: string;
  conversion_stage?: string;
  language?: string;
  ai_enabled?: boolean;
}): Promise<Customer> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-customers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create customer');
    }

    return data.customer;
  } catch (err) {
    console.error('Create customer error:', err);
    throw err;
  }
};

export const updateCustomer = async (customerData: {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  lead_stage?: string;
  interest_stage?: string | null;
  conversion_stage?: string | null;
  language?: string;
  ai_enabled?: boolean;
}): Promise<Customer> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-customers`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(customerData),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update customer');
    }

    return data.customer;
  } catch (err) {
    console.error('Update customer error:', err);
    throw err;
  }
};

export const deleteCustomer = async (id: number): Promise<void> => {
  try {
    const token = getToken();
    if (!token) throw new Error('No token');

    const response = await fetch(`${BACKEND_URL}/manage-customers?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete customer');
    }
  } catch (err) {
    console.error('Delete customer error:', err);
    throw err;
  }
};