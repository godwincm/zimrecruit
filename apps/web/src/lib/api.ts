const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  opts: { auth?: boolean } = { auth: true }
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (opts.auth !== false) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error ?? "Request failed"), { status: res.status, fields: err.fields });
  }

  return res.json() as Promise<T>;
}

function queryString(q?: Record<string, string>) {
  const params = new URLSearchParams(q ?? {});
  const value = params.toString();
  return value ? `?${value}` : "";
}

export const api = {
  auth: {
    register: (data: any) =>
      request<{ ok: boolean; userId: string }>("POST", "/api/auth/register", data, { auth: false }),
    login: (data: any) =>
      request<{ accessToken: string; refreshToken: string; user: any }>("POST", "/api/auth/login", data, { auth: false }),
    logout: () => request("POST", "/api/auth/logout"),
  },

  me: {
    get: () => request<{ user: any; profile: any }>("GET", "/api/me"),
    update: (d: any) => request("PATCH", "/api/me", d),
  },

  jobs: {
    list: (q?: Record<string, string>) => request<{ jobs: any[] }>("GET", `/api/jobs${queryString(q)}`, undefined, { auth: false }),
    get: (id: string) => request<{ job: any }>("GET", `/api/jobs/${id}`, undefined, { auth: false }),
    create: (d: any) => request<{ jobId: string }>("POST", "/api/jobs", d),
    update: (id: string, d: any) => request("PATCH", `/api/jobs/${id}`, d),
    delete: (id: string) => request("DELETE", `/api/jobs/${id}`),
    applicants: (id: string) => request<{ applicants: any[] }>("GET", `/api/jobs/${id}/applicants`),
    candidates: (q?: Record<string, string>) => request<{ candidates: any[] }>("GET", `/api/jobs/candidates${queryString(q)}`),
  },

  applications: {
    apply: (d: any) => request<{ applicationId: string }>("POST", "/api/applications", d),
    mine: () => request<{ applications: any[] }>("GET", "/api/applications/mine"),
    stage: (id: string, status: string) => request("PATCH", `/api/applications/${id}`, { status }),
    interview: (d: any) => request("POST", "/api/applications/interviews", d),
    delete: (id: string) => request("DELETE", `/api/applications/${id}`),
  },

  documents: {
    list: () => request<{ documents: any[] }>("GET", "/api/documents"),
    register: (d: any) => request<{ documentId: string; sha256Hash: string }>("POST", "/api/documents", d),
    requestVerify: (id: string, institutionId: string) => request("POST", `/api/documents/${id}/verify`, { institutionId }),
    delete: (id: string) => request("DELETE", `/api/documents/${id}`),
  },

  verifications: {
    queue: () => request<{ queue: any[]; institutionId: string }>("GET", "/api/verifications/queue"),
    processed: () => request<{ requests: any[]; institutionId: string }>("GET", "/api/verifications/processed"),
    approve: (id: string) => request<{ receiptHash: string; sequenceNumber: number }>("POST", `/api/verifications/${id}/approve`),
    reject: (id: string, reason: string) => request("POST", `/api/verifications/${id}/reject`, { reason }),
  },

  institutions: {
    list: () => request<{ institutions: any[] }>("GET", "/api/institutions", undefined, { auth: false }),
    create: (d: any) => request("POST", "/api/institutions", d),
    suspend: (id: string) => request("PATCH", `/api/institutions/${id}/suspend`),
    addMember: (d: any) => request("POST", "/api/institutions/members", d),
    delete: (id: string) => request("DELETE", `/api/institutions/${id}`),
  },

  admin: {
    audit: (q?: Record<string, string>) => request<{ logs: any[] }>("GET", `/api/admin/audit${queryString(q)}`),
    users: (q?: Record<string, string>) => request<{ users: any[] }>("GET", `/api/admin/users${queryString(q)}`),
    companies: () => request<{ companies: any[] }>("GET", "/api/admin/companies"),
    warnUser: (id: string, d: { reason: string; details?: string }) =>
      request("POST", `/api/admin/users/${id}/warnings`, d),
  },

  public: {
    verify: (hash: string) =>
      request<{ found: boolean; valid: boolean; attestation: any }>("GET", `/api/public/verify/${encodeURIComponent(hash)}`, undefined, { auth: false }),
  },

  messages: {
    contacts: () => request<{ contacts: any[] }>("GET", "/api/messages/contacts"),
    conversations: () => request<{ conversations: any[] }>("GET", "/api/messages"),
    create: (participantId: string, subject?: string) =>
      request<{ conversationId: string }>("POST", "/api/messages", { participantId, subject }),
    list: (conversationId: string) =>
      request<{ messages: any[] }>("GET", `/api/messages/${conversationId}/messages`),
    send: (conversationId: string, body: string) =>
      request<{ id: string }>("POST", `/api/messages/${conversationId}/messages`, { body }),
  },
};
