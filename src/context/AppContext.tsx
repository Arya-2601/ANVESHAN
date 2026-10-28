import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  FDRRecord, 
  User, 
  UserRole, 
  ReleaseRequest, 
  AuditLogEntry, 
  ReminderSettings, 
  FDRStatus, 
  AppNotification, 
  BankConfirmation 
} from '../types';
import { DEMO_USERS } from '../data/mockData';
import { api, setApiAuth } from '../services/api';

interface AppContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  is2FAVerified: boolean;
  sessionTimeoutWarning: boolean;
  maskFdrNumberState: boolean;
  setMaskFdrNumberState: (val: boolean) => void;
  fdrList: FDRRecord[];
  releaseRequests: ReleaseRequest[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  bankConfirmations: BankConfirmation[];
  reminderSettings: ReminderSettings;
  login: (role: UserRole) => void;
  verify2FA: (otp: string) => boolean;
  logout: () => void;
  extendSession: () => void;
  addFDR: (formData: FormData) => Promise<string>;
  updateFDRStatus: (fdrId: string, status: FDRStatus, remarks?: string, notes?: string) => Promise<void>;
  submitReleaseRequest: (formData: FormData) => Promise<string>;
  updateReleaseStatus: (reqId: string, status: ReleaseRequest['status'], remarks?: string) => Promise<void>;
  reviewReleaseRequest: (reqId: string, action: 'approve' | 'hold' | 'reject', remarks: string) => Promise<void>;
  requestBankConfirmation: (id: string) => Promise<void>;
  simulateBankResponse: (id: string) => Promise<void>;
  markBankVerified: (id: string) => Promise<void>;
  raiseBankDiscrepancy: (id: string, remarks: string, reason?: string) => Promise<void>;
  addAuditLog?: (entry: any) => void;
  updateReminderSettings: (settings: Partial<ReminderSettings>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  resetAllData: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const STORAGE_KEYS = {
  USER: 'anveshan_user',
  MASK_FDR: 'anveshan_mask_fdr',
};

const DEFAULT_REMINDERS: ReminderSettings = {
  reminder90Days: true,
  reminder60Days: true,
  reminder30Days: true,
  reminder15Days: true,
  emailAlerts: true,
  smsAlerts: false,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Role (Normalizes any legacy sub-roles to 'official')
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      // Clear legacy localStorage user so fresh visitors always land on the login page
      localStorage.removeItem(STORAGE_KEYS.USER);
      const saved = sessionStorage.getItem(STORAGE_KEYS.USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          const role = (parsed.role === 'supervisor' || parsed.role === 'officer' || parsed.role === 'official') ? 'official' : parsed.role;
          return {
            ...parsed,
            role,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to parse saved user', e);
    }
    return null;
  });

  const [is2FAVerified, setIs2FAVerified] = useState<boolean>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEYS.USER);
      return !!saved;
    } catch {
      return false;
    }
  });
  const [sessionTimeoutWarning, setSessionTimeoutWarning] = useState(false);
  const [maskFdrNumberState, setMaskFdrNumberState] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MASK_FDR);
    return saved ? JSON.parse(saved) : false;
  });

  // Data Collections from backend DB
  const [fdrList, setFdrList] = useState<FDRRecord[]>([]);
  const [releaseRequests, setReleaseRequests] = useState<ReleaseRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [bankConfirmations, setBankConfirmations] = useState<BankConfirmation[]>([]);
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDERS);

  // Sync auth headers with API service and session storage
  useEffect(() => {
    if (currentUser) {
      setApiAuth(currentUser.role, currentUser.id, currentUser.name, currentUser.institutionId);
      sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MASK_FDR, JSON.stringify(maskFdrNumberState));
  }, [maskFdrNumberState]);

  // Comprehensive Fetch from Backend DB
  const refreshAll = useCallback(async () => {
    try {
      const role = currentUser?.role || 'official';
      const instId = currentUser?.institutionId;

      const [fdrs, releases, logs, notifs, bankConf, reminders] = await Promise.all([
        api.getFDRs().catch(() => []),
        api.getReleaseRequests().catch(() => []),
        api.getAuditLogs().catch(() => []),
        api.getNotifications(role, instId).catch(() => []),
        api.getBankConfirmations().catch(() => []),
        api.getReminders().catch(() => DEFAULT_REMINDERS),
      ]);

      setFdrList(fdrs);
      setReleaseRequests(releases);
      setAuditLogs(logs);
      setNotifications(notifs);
      setBankConfirmations(bankConf);
      setReminderSettings(reminders);
    } catch (err) {
      console.error('Error fetching data from API:', err);
    }
  }, [currentUser]);

  // Initial fetch and on user change
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Section 0: Lightweight polling every 5 seconds so both views update without a manual refresh
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAll();
    }, 5000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  // Auth Functions
  const login = (selectedRole: UserRole) => {
    const user = DEMO_USERS[selectedRole];
    setCurrentUser(user);
    setIs2FAVerified(true);
    setApiAuth(user.role, user.id, user.name, user.institutionId);
    // Immediate refetch for the new role
    setTimeout(() => {
      refreshAll();
    }, 50);
  };

  const verify2FA = (otp: string): boolean => {
    if (otp === '123456' || otp === '000000') {
      setIs2FAVerified(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIs2FAVerified(false);
    setSessionTimeoutWarning(false);
    sessionStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.USER);
  };

  const extendSession = () => {
    setSessionTimeoutWarning(false);
  };

  // FDR Mutations
  const addFDR = async (formData: FormData): Promise<string> => {
    const res = await api.createFDR(formData);
    await refreshAll();
    return res.id;
  };

  const updateFDRStatus = async (fdrId: string, status: FDRStatus, remarks?: string, notes?: string) => {
    await api.updateFDRStatus(fdrId, status, remarks, notes);
    await refreshAll();
  };

  // Release Request Mutations
  const submitReleaseRequest = async (formData: FormData): Promise<string> => {
    const res = await api.createReleaseRequest(formData);
    await refreshAll();
    return res.id;
  };

  const updateReleaseStatus = async (reqId: string, status: ReleaseRequest['status'], remarks?: string) => {
    const action = status === 'Approved' || status === 'Released' ? 'approve' : status === 'Rejected' ? 'reject' : 'hold';
    await api.reviewReleaseRequest(reqId, action, remarks || `Status marked as ${status}`);
    await refreshAll();
  };

  const reviewReleaseRequest = async (reqId: string, action: 'approve' | 'hold' | 'reject', remarks: string) => {
    await api.reviewReleaseRequest(reqId, action, remarks);
    await refreshAll();
  };

  // Bank Confirmations
  const requestBankConfirmation = async (id: string) => {
    await api.requestBankConfirmation(id);
    await refreshAll();
  };

  const simulateBankResponse = async (id: string) => {
    await api.simulateBankResponse(id);
    await refreshAll();
  };

  const markBankVerified = async (id: string) => {
    await api.markBankVerified(id);
    await refreshAll();
  };

  const raiseBankDiscrepancy = async (id: string, remarks: string, reason?: string) => {
    await api.raiseBankDiscrepancy(id, remarks, reason);
    await refreshAll();
  };

  // Notifications
  const markNotificationRead = async (id: string) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
  };

  const clearAllNotifications = async () => {
    await api.markAllNotificationsRead(currentUser?.role, currentUser?.institutionId);
    setNotifications(prev => prev.map(n => ({ ...n, readAt: new Date().toISOString() })));
  };

  const updateReminderSettings = async (settings: Partial<ReminderSettings>) => {
    const updated = await api.updateReminders(settings);
    setReminderSettings(updated);
  };

  const resetAllData = async () => {
    await api.resetAll();
    await refreshAll();
  };

  const role = currentUser?.role || null;
  const isAuthenticated = !!currentUser && is2FAVerified;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        role,
        isAuthenticated,
        is2FAVerified,
        sessionTimeoutWarning,
        maskFdrNumberState,
        setMaskFdrNumberState,
        fdrList,
        releaseRequests,
        auditLogs,
        notifications,
        bankConfirmations,
        reminderSettings,
        login,
        verify2FA,
        logout,
        extendSession,
        addFDR,
        updateFDRStatus,
        submitReleaseRequest,
        updateReleaseStatus,
        reviewReleaseRequest,
        requestBankConfirmation,
        simulateBankResponse,
        markBankVerified,
        raiseBankDiscrepancy,
        updateReminderSettings,
        markNotificationRead,
        clearAllNotifications,
        resetAllData,
        refreshAll,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
