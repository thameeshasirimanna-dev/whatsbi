import { getToken } from '../../../../lib/auth';
import { CustomerGroup, GroupMemberDetail, Customer } from '../CustomerTypes';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function getAuthHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token || ''}`,
    'Content-Type': 'application/json',
  };
}

export interface CustomerGroupsResponse {
  success: boolean;
  groups: CustomerGroup[];
  total_groups: number;
  total_grouped_customers: number;
  total_customers: number;
  message?: string;
}

export interface GroupDetailsResponse {
  success: boolean;
  group: CustomerGroup & { members: GroupMemberDetail[] };
  message?: string;
}

export interface ExportPhonesResponse {
  success: boolean;
  group_id: number;
  count: number;
  phones: string[];
  members: { phone: string; name: string }[];
  message?: string;
}

export async function fetchCustomerGroups(): Promise<CustomerGroupsResponse> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch customer groups');
  }
  return response.json();
}

export async function fetchGroupDetails(groupId: number): Promise<GroupDetailsResponse> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups?group_id=${groupId}&include_members=true`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch group details');
  }
  return response.json();
}

export async function createCustomerGroup(payload: {
  name: string;
  description?: string;
  color?: string;
  customer_ids?: number[];
}): Promise<{ success: boolean; group: CustomerGroup; message: string }> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create customer group');
  }
  return data;
}

export async function updateCustomerGroup(payload: {
  id: number;
  name?: string;
  description?: string;
  color?: string;
}): Promise<{ success: boolean; group: CustomerGroup; message: string }> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update customer group');
  }
  return data;
}

export async function addCustomersToGroup(
  groupId: number,
  customerIds: number[]
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      id: groupId,
      action: 'add_members',
      customer_ids: customerIds,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to add members to group');
  }
  return data;
}

export async function removeCustomersFromGroup(
  groupId: number,
  customerIds: number[]
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      id: groupId,
      action: 'remove_members',
      customer_ids: customerIds,
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to remove members from group');
  }
  return data;
}

export async function deleteCustomerGroup(groupId: number): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id: groupId }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete customer group');
  }
  return data;
}

export async function exportGroupPhones(groupId: number): Promise<ExportPhonesResponse> {
  const response = await fetch(`${BACKEND_URL}/manage-customer-groups?group_id=${groupId}&action=export_phones`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Failed to export group phone numbers');
  }
  return data;
}

export async function fetchAllCustomers(): Promise<Customer[]> {
  const response = await fetch(`${BACKEND_URL}/manage-customers`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    return [];
  }
  const data = await response.json();
  if (data.success && Array.isArray(data.customers)) {
    return data.customers.map((c: any) => ({
      ...c,
      id: Number(c.id),
      order_count: Number(c.order_count) || 0,
    }));
  }
  return [];
}

