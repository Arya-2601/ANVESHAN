export type FDRStatus = 
  | 'Active/Verified'
  | 'Pending Scrutiny'
  | 'Pending Bank Verification'
  | 'Discrepancy Flagged'
  | 'Expiring Soon'
  | 'Matured'
  | 'Renewed'
  | 'Released'
  | 'Rejected';

export type UserRole = 'institution' | 'official';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  institutionId?: string;
  institutionName?: string;
  email: string;
  department?: string;
}

export interface BankData {
  accountNumber: string;
  bankName: string;
  branchIfsc: string;
  principalAmount: number;
  issueDate: string;
  maturityDate: string;
  lienMarkedToAICTE: boolean;
  interestRate: number;
  statusInBank: 'Active' | 'Closed' | 'Under Lien';
}

export interface FDRRecord {
  id: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  state: string;
  bankName: string;
  branchIfsc: string;
  principalAmount: number;
  issueDate: string;
  maturityDate: string;
  status: FDRStatus;
  documentUrl: string;
  documentName: string;
  documentSize: string;
  verificationConsent: boolean;
  discrepancyRemarks?: string;
  internalAuditNotes?: string;
  renewalDue?: boolean;
  previousFdrId?: string;
  renewedFdrId?: string;
  version: number;
  bankData?: BankData;
  bankMatchSimulated: boolean;
  lastVerifiedDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  fdrId: string;
  fdrNumber: string;
  timestamp: string;
  performedBy: string;
  role: 'Institution' | 'AICTE Official' | 'Bank System API' | 'OCR System';
  action: string;
  details: string;
  hash?: string;
}

export interface ReleaseRequest {
  id: string;
  fdrId: string;
  fdrNumber: string;
  institutionId: string;
  institutionName: string;
  principalAmount: number;
  bankName: string;
  reason: string;
  supportingDocName?: string;
  requestDate: string;
  status: 'Requested' | 'Under Review' | 'Approved' | 'Released' | 'Rejected';
  reviewedBy?: string;
  reviewDate?: string;
  remarks?: string;
}

export interface ReminderSettings {
  reminder90Days: boolean;
  reminder60Days: boolean;
  reminder30Days: boolean;
  reminder15Days: boolean;
  emailAlerts: boolean;
  smsAlerts: boolean;
}

export type DocumentCategory = 
  | 'fdr_scan' 
  | 'release_resolution' 
  | 'no_dues' 
  | 'renewal' 
  | 'resubmission' 
  | 'other';

export interface AppDocument {
  id: string;
  fdrId: string;
  institutionId: string;
  releaseRequestId?: string | null;
  category: DocumentCategory;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  version: number;
  supersedesId?: string | null;
  uploadedByRole: 'institution' | 'official';
  uploadedByUserId: string;
  uploadedAt: string;
  status: 'current' | 'superseded';
}

export interface AppNotification {
  id: string;
  recipientRole: 'institution' | 'official';
  recipientInstitutionId?: string | null;
  fdrId?: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  link?: string;
}

export type BankConfirmationStatus = 
  | 'not_requested' 
  | 'requested' 
  | 'received' 
  | 'mismatch' 
  | 'matched';

export interface BankFields {
  accountHolder: string;
  fdrNumber: string;
  principalAmount: number;
  issueDate: string;
  maturityDate: string;
  branchName: string;
  ifsc: string;
  lienMarkedInFavourOf: boolean;
  interestRate: number;
  status: string;
}

export interface BankConfirmation {
  id: string;
  fdrId: string;
  bankName: string;
  requestedAt?: string | null;
  respondedAt?: string | null;
  status: BankConfirmationStatus;
  simulated: boolean;
  bankFields: BankFields;
}

