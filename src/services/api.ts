import { 
  FDRRecord, 
  ReleaseRequest, 
  AuditLogEntry, 
  ReminderSettings, 
  AppNotification, 
  AppDocument, 
  BankConfirmation,
  UserRole 
} from '../types';

let currentRole: UserRole = 'official';
let currentUserId = 'USR-AICTE-007';
let currentUserName = 'Dr. Anand K. Srivastava';
let currentInstitutionId = 'INST102';

export function setApiAuth(role: UserRole, userId?: string, userName?: string, instId?: string) {
  currentRole = role;
  if (userId) currentUserId = userId;
  if (userName) currentUserName = userName;
  if (instId) currentInstitutionId = instId;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'x-user-role': currentRole,
    'x-user-id': currentUserId,
    'x-user-name': currentUserName,
    'x-institution-id': currentInstitutionId,
    ...customHeaders,
  };
}

export const api = {
  // FDRs
  async getFDRs(): Promise<FDRRecord[]> {
    const res = await fetch('/api/fdrs', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch FDR records');
    return res.json();
  },

  async getFDR(id: string): Promise<FDRRecord> {
    const res = await fetch(`/api/fdrs/${id}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('FDR not found');
    return res.json();
  },

  async createFDR(formData: FormData): Promise<{ success: boolean; id: string; documentId: string }> {
    const res = await fetch('/api/fdrs', {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit FDR');
    }
    return res.json();
  },

  async updateFDRStatus(fdrId: string, status: string, remarks?: string, notes?: string): Promise<void> {
    const res = await fetch(`/api/fdrs/${fdrId}/status`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ status, remarks, notes, userRole: currentRole, userName: currentUserName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to update FDR status');
    }
  },

  // Documents
  async getDocuments(fdrId: string): Promise<AppDocument[]> {
    const res = await fetch(`/api/fdrs/${fdrId}/documents`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch documents');
    return res.json();
  },

  async getFdrDocuments(fdrId: string): Promise<AppDocument[]> {
    return this.getDocuments(fdrId);
  },

  async uploadDocument(fdrId: string, formData: FormData): Promise<{ success: boolean; documentId: string; version: number; url: string }> {
    const res = await fetch(`/api/fdrs/${fdrId}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to upload document');
    }
    return res.json();
  },

  // Release Requests
  async getReleaseRequests(): Promise<ReleaseRequest[]> {
    const res = await fetch('/api/release-requests', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch release requests');
    return res.json();
  },

  async createReleaseRequest(formData: FormData): Promise<{ success: boolean; id: string }> {
    const res = await fetch('/api/release-requests', {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit release request');
    }
    return res.json();
  },

  async reviewReleaseRequest(reqId: string, action: 'approve' | 'hold' | 'reject', remarks: string): Promise<{ success: boolean; status: string }> {
    const res = await fetch(`/api/release-requests/${reqId}`, {
      method: 'PATCH',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ action, remarks, userRole: currentRole, userName: currentUserName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to review release request');
    }
    return res.json();
  },

  // Notifications
  async getNotifications(role?: string, instId?: string): Promise<AppNotification[]> {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (instId) params.set('institutionId', instId);
    const res = await fetch(`/api/notifications?${params.toString()}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationRead(id: string): Promise<void> {
    await fetch(`/api/notifications/${id}/read`, {
      method: 'POST',
      headers: getHeaders(),
    });
  },

  async markAllNotificationsRead(role?: string, instId?: string): Promise<void> {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ role, institutionId: instId }),
    });
  },

  // Bank Confirmations
  async getBankConfirmations(): Promise<BankConfirmation[]> {
    const res = await fetch('/api/bank-confirmations', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch bank confirmations');
    return res.json();
  },

  async requestBankConfirmation(id: string): Promise<void> {
    const res = await fetch(`/api/bank-confirmations/${id}/request`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to request confirmation');
  },

  async simulateBankResponse(id: string): Promise<void> {
    const res = await fetch(`/api/bank-confirmations/${id}/simulate-response`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to simulate bank response');
  },

  async markBankVerified(id: string): Promise<void> {
    const res = await fetch(`/api/bank-confirmations/${id}/mark-verified`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to mark verified');
    }
  },

  async raiseBankDiscrepancy(id: string, remarks: string, reason?: string): Promise<void> {
    const res = await fetch(`/api/bank-confirmations/${id}/discrepancy`, {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ remarks, reason, userRole: currentRole, userName: currentUserName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to raise discrepancy');
    }
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLogEntry[]> {
    const res = await fetch('/api/audit-logs', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Reminders
  async getReminders(): Promise<ReminderSettings> {
    const res = await fetch('/api/reminders', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to fetch reminders');
    return res.json();
  },

  async updateReminders(settings: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const res = await fetch('/api/reminders', {
      method: 'PUT',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Failed to update reminders');
    return res.json();
  },

  // Reset
  async resetAll(): Promise<void> {
    const res = await fetch('/api/reset', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to reset database');
  },
};
