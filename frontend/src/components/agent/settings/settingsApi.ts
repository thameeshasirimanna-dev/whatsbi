import { getToken } from '../../../lib/auth';

export async function fetchAgentProfileApi(backendUrl: string) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/get-agent-profile`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export async function fetchTeamMembersApi(backendUrl: string) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/agent/get-users`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export async function updateAgentDetailsApi(
  backendUrl: string,
  body: { agent_id: number; user_updates?: Record<string, any>; agent_updates?: Record<string, any> }
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/update-agent-details`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.json();
}

export async function updatePasswordApi(
  backendUrl: string,
  currentPass: string,
  newPass: string
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/update-password`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      current_password: currentPass,
      new_password: newPass,
    }),
  });
  return response.json();
}

export async function uploadInvoiceTemplateApi(
  backendUrl: string,
  agentId: string,
  file: File
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const reader = new FileReader();
  const base64 = await new Promise((resolve) => {
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const fileBase64 = (base64 as string).split(',')[1];
  const fileType = file.type;
  const fName = file.name;
  const response = await fetch(`${backendUrl}/upload-invoice-template`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId,
      file: { fileName: fName, fileBase64, fileType },
    }),
  });
  return response.json();
}

export async function removeInvoiceTemplateApi(backendUrl: string, agentId: number) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/update-agent-template-path`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agent_id: agentId, template_path: null }),
  });
  return response.json();
}

export async function saveCompanyOverviewApi(
  backendUrl: string,
  agentId: string,
  companyOverview: string
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/update-company-overview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId,
      company_overview: companyOverview,
    }),
  });
  return response.json();
}

export async function deleteCompanyOverviewApi(backendUrl: string, agentId: string) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/delete-company-overview`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentId }),
  });
  return response.json();
}

export async function saveAiInstructionsApi(
  backendUrl: string,
  agentId: string,
  aiInstructions: string
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/update-ai-instructions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      agentId,
      ai_instructions: aiInstructions,
    }),
  });
  return response.json();
}

export async function deleteAiInstructionsApi(backendUrl: string, agentId: string) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/delete-ai-instructions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ agentId }),
  });
  return response.json();
}

export async function addTeamMemberApi(
  backendUrl: string,
  name: string,
  email: string,
  password: string
) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/agent/add-user`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });
  return response.json();
}

export async function deleteTeamMemberApi(backendUrl: string, userId: string) {
  const token = getToken();
  if (!token) throw new Error('User not authenticated');
  const response = await fetch(`${backendUrl}/agent/delete-user/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}

export async function downloadInvoiceMarginGuide(backendUrl: string) {
  const triggerDownload = (blobUrl: string) => {
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'Invoice_Margin_Guide.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  try {
    const response = await fetch(`${backendUrl}/get-invoice-template`);
    if (!response.ok) throw new Error('Failed to fetch guide template');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    triggerDownload(url);
    URL.revokeObjectURL(url);
  } catch {
    triggerDownload(`${backendUrl}/get-invoice-template`);
  }
}
