import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { 
  AppDocument, 
  AppNotification, 
  BankConfirmation, 
  FDRRecord, 
  ReleaseRequest, 
  AuditLogEntry, 
  ReminderSettings 
} from '../types/index.ts';
import { createStyledPdf, ensureDirectoryExists } from './generateSampleDocs.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const PUBLIC_DOCS_DIR = path.resolve(process.cwd(), 'public', 'sample-docs');
const DB_FILE = path.resolve(DATA_DIR, 'anveshan.db');

ensureDirectoryExists(DATA_DIR);
ensureDirectoryExists(UPLOADS_DIR);
ensureDirectoryExists(PUBLIC_DOCS_DIR);

export const db = new DatabaseSync(DB_FILE);

// Setup Schema
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      fdrId TEXT NOT NULL,
      institutionId TEXT NOT NULL,
      releaseRequestId TEXT,
      category TEXT NOT NULL,
      originalName TEXT NOT NULL,
      storedName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      sizeBytes INTEGER NOT NULL,
      version INTEGER NOT NULL,
      supersedesId TEXT,
      uploadedByRole TEXT NOT NULL,
      uploadedByUserId TEXT NOT NULL,
      uploadedAt TEXT NOT NULL,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipientRole TEXT NOT NULL,
      recipientInstitutionId TEXT,
      fdrId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      readAt TEXT,
      link TEXT
    );

    CREATE TABLE IF NOT EXISTS bank_confirmations (
      id TEXT PRIMARY KEY,
      fdrId TEXT NOT NULL,
      bankName TEXT NOT NULL,
      requestedAt TEXT,
      respondedAt TEXT,
      status TEXT NOT NULL,
      simulated INTEGER NOT NULL DEFAULT 1,
      bankFields TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fdrs (
      id TEXT PRIMARY KEY,
      fdrNumber TEXT NOT NULL,
      institutionId TEXT NOT NULL,
      institutionName TEXT NOT NULL,
      state TEXT NOT NULL,
      bankName TEXT NOT NULL,
      branchIfsc TEXT NOT NULL,
      principalAmount INTEGER NOT NULL,
      issueDate TEXT NOT NULL,
      maturityDate TEXT NOT NULL,
      status TEXT NOT NULL,
      documentUrl TEXT NOT NULL,
      documentName TEXT NOT NULL,
      documentSize TEXT NOT NULL,
      verificationConsent INTEGER NOT NULL,
      discrepancyRemarks TEXT,
      internalAuditNotes TEXT,
      renewalDue INTEGER NOT NULL DEFAULT 0,
      previousFdrId TEXT,
      renewedFdrId TEXT,
      version INTEGER NOT NULL DEFAULT 1,
      bankData TEXT,
      bankMatchSimulated INTEGER NOT NULL DEFAULT 1,
      lastVerifiedDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS release_requests (
      id TEXT PRIMARY KEY,
      fdrId TEXT NOT NULL,
      fdrNumber TEXT NOT NULL,
      institutionId TEXT NOT NULL,
      institutionName TEXT NOT NULL,
      principalAmount INTEGER NOT NULL,
      bankName TEXT NOT NULL,
      reason TEXT NOT NULL,
      supportingDocName TEXT,
      requestDate TEXT NOT NULL,
      status TEXT NOT NULL,
      reviewedBy TEXT,
      reviewDate TEXT,
      remarks TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      fdrId TEXT NOT NULL,
      fdrNumber TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      performedBy TEXT NOT NULL,
      role TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reminder_settings (
      id TEXT PRIMARY KEY,
      settings TEXT NOT NULL
    );
  `);

  // Check if seeded
  const fdrCount = (db.prepare('SELECT COUNT(*) as count FROM fdrs').get() as any).count;
  if (fdrCount === 0) {
    seedDatabase();
  } else {
    // Ensure placeholder docs exist on disk
    generateStagePlaceholders();
  }
}

// Generate Stage Placeholder PDFs
function generateStagePlaceholders() {
  const stageDefs: Array<{ file: string; title: string; sub: string; meta: Record<string, string> }> = [
    {
      file: 'stage_submitted_placeholder.pdf',
      title: 'Submitted FDR Instrument Scan',
      sub: 'Stage 1: Primary Deposit Submission & Cross-Verification Consent',
      meta: { 'Lifecycle Stage': 'Stage 1 — Instrument Submission', 'AICTE Reg': 'Mandatory Electronic Archival', 'Status': 'Stored in Immutable Record' }
    },
    {
      file: 'stage_verification_placeholder.pdf',
      title: 'Simulated Core Banking Confirmation Record',
      sub: 'Stage 2: Core Banking Electronic Lien Verification',
      meta: { 'Lifecycle Stage': 'Stage 2 — Bank Verification', 'Interface': 'AICTE Core Bank Bridge (Simulated)', 'Status': 'Awaiting Electronic Reconciliation' }
    },
    {
      file: 'stage_accepted_placeholder.pdf',
      title: 'AICTE Compliance Acceptance Note',
      sub: 'Stage 3: Formal Joint Lien Endorsement & Bureau Approval',
      meta: { 'Lifecycle Stage': 'Stage 3 — Accepted by Scrutiny Bureau', 'Authority': 'Member Secretary, AICTE', 'Status': 'Compliance Criteria Satisfied' }
    },
    {
      file: 'stage_monitoring_placeholder.pdf',
      title: 'Annual Monitoring & Interest Credit Audit',
      sub: 'Stage 4: Continuous Lock-in Period & Surveillance',
      meta: { 'Lifecycle Stage': 'Stage 4 — Active Monitoring', 'Lock-in Period': '5 Years Mandatory', 'Status': 'Under Active Bureau Surveillance' }
    },
    {
      file: 'stage_renewal_placeholder.pdf',
      title: 'FDR Renewal Instrument & Term Extension Order',
      sub: 'Stage 5: Renewal Submission & Fresh Joint Lien Endorsement',
      meta: { 'Lifecycle Stage': 'Stage 5 — Renewal / Replacement', 'Tenure Extension': 'Fresh Maturity Alignment', 'Status': 'Awaiting Renewal Cross-Verification' }
    },
    {
      file: 'stage_release_placeholder.pdf',
      title: 'Security Deposit Release & No Dues Discharge Order',
      sub: 'Stage 6: Final Discharge of AICTE Joint Lien Claim',
      meta: { 'Lifecycle Stage': 'Stage 6 — Deposit Release', 'Regulatory Ground': 'Normative Lock-in Met / No Student Dues', 'Status': 'Official Discharge Order Pending' }
    }
  ];

  for (const s of stageDefs) {
    const dest = path.resolve(PUBLIC_DOCS_DIR, s.file);
    if (!fs.existsSync(dest)) {
      const buf = createStyledPdf(s.title, s.sub, s.meta, 'This simulated document is generated by the AICTE Anveshan system for preview demonstration.', true);
      fs.writeFileSync(dest, buf);
    }
  }
}

// Write Audit Log with cryptographic hash chain
export function writeAuditLog(entry: {
  fdrId: string;
  fdrNumber: string;
  performedBy: string;
  role: 'Institution' | 'AICTE Official' | 'Bank System API' | 'OCR System';
  action: string;
  details: string;
}): AuditLogEntry {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  
  // Previous hash for chain
  const lastLog = db.prepare('SELECT hash FROM audit_logs ORDER BY rowid DESC LIMIT 1').get() as any;
  const prevHash = lastLog?.hash || '000000000000000000';
  
  const hash = crypto
    .createHash('sha256')
    .update(prevHash + timestamp + entry.fdrId + entry.action + entry.details)
    .digest('hex')
    .substring(0, 18);

  const id = `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, fdrId, fdrNumber, timestamp, performedBy, role, action, details, hash)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, entry.fdrId, entry.fdrNumber, timestamp, entry.performedBy, entry.role, entry.action, entry.details, hash);

  return {
    id,
    fdrId: entry.fdrId,
    fdrNumber: entry.fdrNumber,
    timestamp,
    performedBy: entry.performedBy,
    role: entry.role,
    action: entry.action,
    details: entry.details,
    hash
  };
}

// Create Notification
export function createNotification(notif: {
  recipientRole: 'institution' | 'official';
  recipientInstitutionId?: string | null;
  fdrId?: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  title: string;
  message: string;
  link?: string;
}): AppNotification {
  const id = `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date().toISOString();

  const stmt = db.prepare(`
    INSERT INTO notifications (id, recipientRole, recipientInstitutionId, fdrId, type, title, message, createdAt, readAt, link)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
  `);
  stmt.run(
    id,
    notif.recipientRole,
    notif.recipientInstitutionId || null,
    notif.fdrId || null,
    notif.type,
    notif.title,
    notif.message,
    createdAt,
    notif.link || null
  );

  return {
    id,
    recipientRole: notif.recipientRole,
    recipientInstitutionId: notif.recipientInstitutionId || null,
    fdrId: notif.fdrId,
    type: notif.type,
    title: notif.title,
    message: notif.message,
    createdAt,
    readAt: null,
    link: notif.link
  };
}

// Reset and Seed Database
export function seedDatabase() {
  db.exec(`
    DELETE FROM documents;
    DELETE FROM notifications;
    DELETE FROM bank_confirmations;
    DELETE FROM fdrs;
    DELETE FROM release_requests;
    DELETE FROM audit_logs;
    DELETE FROM reminder_settings;
  `);

  generateStagePlaceholders();

  // 1. Seed FDRs
  const initialFDRs: FDRRecord[] = [
    {
      id: 'fdr-001',
      fdrNumber: 'FDR-2026-8801',
      institutionId: 'INST102',
      institutionName: 'Veermata Jijabai Technological Institute (VJTI)',
      state: 'Maharashtra',
      bankName: 'State Bank of India',
      branchIfsc: 'SBIN0001107',
      principalAmount: 3500000,
      issueDate: '2026-09-15',
      maturityDate: '2029-09-15',
      status: 'Pending Scrutiny',
      documentUrl: '/api/documents/doc-fdr-001-v1/file',
      documentName: 'SBI_FDR_35L_Deposit.pdf',
      documentSize: '2.4 MB',
      verificationConsent: true,
      version: 1,
      bankMatchSimulated: true,
      bankData: {
        accountNumber: 'FDR-2026-8801',
        bankName: 'State Bank of India',
        branchIfsc: 'SBIN0001107',
        principalAmount: 3500000,
        issueDate: '2026-09-15',
        maturityDate: '2029-09-15',
        lienMarkedToAICTE: true,
        interestRate: 7.25,
        statusInBank: 'Active',
      },
      createdAt: '2026-10-18T10:30:00Z',
      updatedAt: '2026-10-18T10:30:00Z',
    },
    {
      id: 'fdr-002',
      fdrNumber: 'FDR-2026-0148',
      institutionId: 'INST102',
      institutionName: 'Veermata Jijabai Technological Institute (VJTI)',
      state: 'Maharashtra',
      bankName: 'Bank of Baroda',
      branchIfsc: 'BARB0MATUNG',
      principalAmount: 5000000,
      issueDate: '2026-04-09',
      maturityDate: '2026-11-16',
      status: 'Discrepancy Flagged',
      documentUrl: '/api/documents/doc-fdr-002-v2/file',
      documentName: 'BOB_Corrected_Lien_Receipt.pdf',
      documentSize: '1.9 MB',
      verificationConsent: true,
      discrepancyRemarks: 'Mismatch in Principal Amount: College entered ₹ 50,00,000 whereas Bank API confirmed ₹ 5,00,000. Lien mark is also missing in bank record.',
      internalAuditNotes: 'Flagged by Official A. Sharma. Awaiting clarified receipt or fresh bank lien certificate.',
      version: 2,
      bankMatchSimulated: false,
      bankData: {
        accountNumber: 'FDR-2026-0148',
        bankName: 'Bank of Baroda',
        branchIfsc: 'BARB0MATUNG',
        principalAmount: 500000,
        issueDate: '2026-04-09',
        maturityDate: '2026-11-16',
        lienMarkedToAICTE: false,
        interestRate: 6.8,
        statusInBank: 'Active',
      },
      createdAt: '2026-10-10T09:00:00Z',
      updatedAt: '2026-10-25T11:45:00Z',
    },
    {
      id: 'fdr-003',
      fdrNumber: 'FDR-2026-5542',
      institutionId: 'INST105',
      institutionName: 'BMS College of Engineering',
      state: 'Karnataka',
      bankName: 'HDFC Bank',
      branchIfsc: 'HDFC0000043',
      principalAmount: 2500000,
      issueDate: '2026-08-01',
      maturityDate: '2029-08-01',
      status: 'Pending Bank Verification',
      documentUrl: '/api/documents/doc-fdr-003-v1/file',
      documentName: 'HDFC_TermDeposit_25L.pdf',
      documentSize: '2.1 MB',
      verificationConsent: true,
      version: 1,
      bankMatchSimulated: false,
      bankData: {
        accountNumber: 'FDR-2026-5542',
        bankName: 'HDFC Bank',
        branchIfsc: 'HDFC0000043',
        principalAmount: 2500000,
        issueDate: '2026-08-01',
        maturityDate: '2029-08-01',
        lienMarkedToAICTE: true,
        interestRate: 7.1,
        statusInBank: 'Active',
      },
      createdAt: '2026-10-20T14:20:00Z',
      updatedAt: '2026-10-20T14:20:00Z',
    },
    {
      id: 'fdr-004',
      fdrNumber: 'FDR-2026-7719',
      institutionId: 'INST114',
      institutionName: 'Delhi Technological University (DTU)',
      state: 'Delhi',
      bankName: 'Punjab National Bank',
      branchIfsc: 'PUNB0112200',
      principalAmount: 4000000,
      issueDate: '2026-01-10',
      maturityDate: '2031-01-10',
      status: 'Active/Verified',
      documentUrl: '/api/documents/doc-fdr-004-v1/file',
      documentName: 'PNB_Official_Lien_FDR.pdf',
      documentSize: '3.1 MB',
      verificationConsent: true,
      version: 1,
      bankMatchSimulated: true,
      bankData: {
        accountNumber: 'FDR-2026-7719',
        bankName: 'Punjab National Bank',
        branchIfsc: 'PUNB0112200',
        principalAmount: 4000000,
        issueDate: '2026-01-10',
        maturityDate: '2031-01-10',
        lienMarkedToAICTE: true,
        interestRate: 7.4,
        statusInBank: 'Under Lien',
      },
      lastVerifiedDate: '2026-01-18',
      createdAt: '2026-01-10T11:00:00Z',
      updatedAt: '2026-01-18T16:00:00Z',
    },
    {
      id: 'fdr-005',
      fdrNumber: 'FDR-2025-9920',
      institutionId: 'INST109',
      institutionName: 'PSG College of Technology',
      state: 'Tamil Nadu',
      bankName: 'Canara Bank',
      branchIfsc: 'CNRB0000881',
      principalAmount: 3000000,
      issueDate: '2023-11-20',
      maturityDate: '2026-11-20',
      status: 'Expiring Soon',
      documentUrl: '/api/documents/doc-fdr-005-v1/file',
      documentName: 'CanaraBank_FDR_30L.pdf',
      documentSize: '2.0 MB',
      verificationConsent: true,
      renewalDue: true,
      version: 1,
      bankMatchSimulated: true,
      bankData: {
        accountNumber: 'FDR-2025-9920',
        bankName: 'Canara Bank',
        branchIfsc: 'CNRB0000881',
        principalAmount: 3000000,
        issueDate: '2023-11-20',
        maturityDate: '2026-11-20',
        lienMarkedToAICTE: true,
        interestRate: 7.0,
        statusInBank: 'Active',
      },
      createdAt: '2023-11-20T10:00:00Z',
      updatedAt: '2026-10-27T08:00:00Z',
    },
    {
      id: 'fdr-006',
      fdrNumber: 'FDR-2026-1104-R',
      institutionId: 'INST125',
      institutionName: 'L.D. College of Engineering',
      state: 'Gujarat',
      bankName: 'ICICI Bank',
      branchIfsc: 'ICIC0000104',
      principalAmount: 2000000,
      issueDate: '2026-10-15',
      maturityDate: '2029-10-15',
      status: 'Renewed',
      documentUrl: '/api/documents/doc-fdr-006-v2/file',
      documentName: 'ICICI_Renewal_Endorsement_20L.pdf',
      documentSize: '1.7 MB',
      verificationConsent: true,
      previousFdrId: 'fdr-006-old',
      version: 2,
      bankMatchSimulated: true,
      bankData: {
        accountNumber: 'FDR-2026-1104-R',
        bankName: 'ICICI Bank',
        branchIfsc: 'ICIC0000104',
        principalAmount: 2000000,
        issueDate: '2026-10-15',
        maturityDate: '2029-10-15',
        lienMarkedToAICTE: true,
        interestRate: 7.3,
        statusInBank: 'Under Lien',
      },
      createdAt: '2026-10-15T09:00:00Z',
      updatedAt: '2026-10-16T10:00:00Z',
    }
  ];

  const insertFdr = db.prepare(`
    INSERT INTO fdrs (
      id, fdrNumber, institutionId, institutionName, state, bankName, branchIfsc,
      principalAmount, issueDate, maturityDate, status, documentUrl, documentName, documentSize,
      verificationConsent, discrepancyRemarks, internalAuditNotes, renewalDue, previousFdrId,
      renewedFdrId, version, bankData, bankMatchSimulated, lastVerifiedDate, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  for (const f of initialFDRs) {
    insertFdr.run(
      f.id, f.fdrNumber, f.institutionId, f.institutionName, f.state, f.bankName, f.branchIfsc,
      f.principalAmount, f.issueDate, f.maturityDate, f.status, f.documentUrl, f.documentName, f.documentSize,
      f.verificationConsent ? 1 : 0, f.discrepancyRemarks || null, f.internalAuditNotes || null,
      f.renewalDue ? 1 : 0, f.previousFdrId || null, f.renewedFdrId || null, f.version,
      JSON.stringify(f.bankData), f.bankMatchSimulated ? 1 : 0, f.lastVerifiedDate || null,
      f.createdAt, f.updatedAt
    );
  }

  // 2. Generate and store Sample Documents in ./data/uploads/<fdrId>/
  const sampleDocsDefs: Array<{
    docId: string;
    fdrId: string;
    institutionId: string;
    releaseRequestId?: string | null;
    category: AppDocument['category'];
    originalName: string;
    storedName: string;
    version: number;
    supersedesId?: string | null;
    uploadedByRole: 'institution' | 'official';
    uploadedByUserId: string;
    uploadedAt: string;
    status: 'current' | 'superseded';
    title: string;
    sub: string;
    meta: Record<string, string>;
    note?: string;
  }> = [
    // FDR-001 (SBI)
    {
      docId: 'doc-fdr-001-v1',
      fdrId: 'fdr-001',
      institutionId: 'INST102',
      category: 'fdr_scan',
      originalName: 'SBI_FDR_35L_Deposit.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-102',
      uploadedAt: '2026-10-18T10:30:00Z',
      status: 'current',
      title: 'STATE BANK OF INDIA - FIXED DEPOSIT RECEIPT',
      sub: 'Joint Lien Security Deposit in Favour of Member Secretary, AICTE',
      meta: {
        'FDR Account Number': 'FDR-2026-8801',
        'Account Holder': 'Veermata Jijabai Technological Institute (VJTI)',
        'Principal Amount': 'INR 35,00,000 (Thirty-Five Lakhs Only)',
        'Issuing Branch': 'Matunga Branch (IFSC: SBIN0001107)',
        'Issue Date': '15-Sep-2026',
        'Maturity Date': '15-Sep-2029',
        'Lien Clause': 'Marked to Member Secretary, AICTE, New Delhi'
      }
    },
    // FDR-002 v1 (Superseded)
    {
      docId: 'doc-fdr-002-v1',
      fdrId: 'fdr-002',
      institutionId: 'INST102',
      category: 'fdr_scan',
      originalName: 'BOB_Receipt_Scanned.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-102',
      uploadedAt: '2026-10-10T09:00:00Z',
      status: 'superseded',
      title: 'BANK OF BARODA - TERM DEPOSIT RECEIPT (Original v1)',
      sub: 'Term Deposit Receipt — Original College Upload',
      meta: {
        'FDR Account Number': 'FDR-2026-0148',
        'Account Holder': 'Veermata Jijabai Tech Inst (VJTI)',
        'Entered Amount': 'INR 50,00,000 (Fifty Lakhs Only)',
        'Branch': 'Matunga (IFSC: BARB0MATUNG)',
        'Issue Date': '09-Apr-2026',
        'Maturity Date': '16-Nov-2026'
      },
      note: 'FLAGGED DISCREPANCY: Core Banking API reported deposit as INR 5,00,000 only. Lien was missing.'
    },
    // FDR-002 v2 (Resubmitted, Current)
    {
      docId: 'doc-fdr-002-v2',
      fdrId: 'fdr-002',
      institutionId: 'INST102',
      category: 'resubmission',
      originalName: 'BOB_Corrected_Lien_Receipt.pdf',
      storedName: 'resubmission_v2.pdf',
      version: 2,
      supersedesId: 'doc-fdr-002-v1',
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-102',
      uploadedAt: '2026-10-25T11:45:00Z',
      status: 'current',
      title: 'BANK OF BARODA - REVISED FIXED DEPOSIT RECEIPT (v2)',
      sub: 'Clarification & Corrected Joint Lien Endorsement',
      meta: {
        'FDR Account Number': 'FDR-2026-0148',
        'Account Holder': 'Veermata Jijabai Technological Institute (VJTI)',
        'Corrected Principal': 'INR 50,00,000 (Confirmed Fifty Lakhs)',
        'Endorsing Official': 'Senior Branch Manager, BOB Matunga',
        'Lien Status': 'Joint Lien with AICTE strictly endorsed'
      },
      note: 'Resubmitted with bank manager counter-signature and verified stamp.'
    },
    // FDR-003
    {
      docId: 'doc-fdr-003-v1',
      fdrId: 'fdr-003',
      institutionId: 'INST105',
      category: 'fdr_scan',
      originalName: 'HDFC_TermDeposit_25L.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-105',
      uploadedAt: '2026-10-20T14:20:00Z',
      status: 'current',
      title: 'HDFC BANK - SECURITY DEPOSIT RECEIPT',
      sub: 'Mandatory Term Deposit for Institutional Technical Approval',
      meta: {
        'FDR Account Number': 'FDR-2026-5542',
        'Account Holder': 'BMS College of Engineering',
        'Principal Amount': 'INR 25,00,000 (Twenty-Five Lakhs Only)',
        'Branch': 'Bull Temple Road (IFSC: HDFC0000043)',
        'Issue Date': '01-Aug-2026',
        'Maturity Date': '01-Aug-2029'
      }
    },
    // FDR-004
    {
      docId: 'doc-fdr-004-v1',
      fdrId: 'fdr-004',
      institutionId: 'INST114',
      category: 'fdr_scan',
      originalName: 'PNB_Official_Lien_FDR.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-114',
      uploadedAt: '2026-01-10T11:00:00Z',
      status: 'current',
      title: 'PUNJAB NATIONAL BANK - TERM DEPOSIT CERTIFICATE',
      sub: 'Verified Institutional Joint Security Deposit',
      meta: {
        'FDR Account Number': 'FDR-2026-7719',
        'Account Holder': 'Delhi Technological University (DTU)',
        'Principal Amount': 'INR 40,00,000 (Forty Lakhs Only)',
        'Branch': 'Bawana Road, Rohini (IFSC: PUNB0112200)',
        'Status': 'Under Joint Lien to AICTE'
      }
    },
    // FDR-005
    {
      docId: 'doc-fdr-005-v1',
      fdrId: 'fdr-005',
      institutionId: 'INST109',
      category: 'fdr_scan',
      originalName: 'CanaraBank_FDR_30L.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-109',
      uploadedAt: '2023-11-20T10:00:00Z',
      status: 'current',
      title: 'CANARA BANK - FIXED DEPOSIT RECEIPT',
      sub: 'Security Deposit for Post-Graduate Program Approval',
      meta: {
        'FDR Account Number': 'FDR-2025-9920',
        'Account Holder': 'PSG College of Technology',
        'Principal Amount': 'INR 30,00,000 (Thirty Lakhs Only)',
        'Maturity Date': '20-Nov-2026 (Expiring in 24 Days)'
      }
    },
    // FDR-006 v1 (superseded)
    {
      docId: 'doc-fdr-006-v1',
      fdrId: 'fdr-006',
      institutionId: 'INST125',
      category: 'fdr_scan',
      originalName: 'ICICI_Original_FDR_20L.pdf',
      storedName: 'fdr_scan_v1.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-125',
      uploadedAt: '2023-10-15T09:00:00Z',
      status: 'superseded',
      title: 'ICICI BANK - TERM DEPOSIT (Original v1)',
      sub: 'Initial Security Deposit Receipt',
      meta: {
        'FDR Account Number': 'FDR-2023-1104',
        'Account Holder': 'L.D. College of Engineering',
        'Principal': 'INR 20,00,000'
      }
    },
    // FDR-006 v2 (renewal, current)
    {
      docId: 'doc-fdr-006-v2',
      fdrId: 'fdr-006',
      institutionId: 'INST125',
      category: 'renewal',
      originalName: 'ICICI_Renewal_Endorsement_20L.pdf',
      storedName: 'renewal_v2.pdf',
      version: 2,
      supersedesId: 'doc-fdr-006-v1',
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-125',
      uploadedAt: '2026-10-15T09:00:00Z',
      status: 'current',
      title: 'ICICI BANK - FDR RENEWAL ENDORSEMENT (v2)',
      sub: 'Three-Year Term Extension with AICTE Joint Lien Continuity',
      meta: {
        'Renewed FDR Number': 'FDR-2026-1104-R',
        'Original FDR Number': 'FDR-2023-1104',
        'Account Holder': 'L.D. College of Engineering',
        'Principal Amount': 'INR 20,00,000 (Twenty Lakhs)',
        'New Maturity Date': '15-Oct-2029'
      }
    },
    // Release Request 1 Supporting Resolution PDF
    {
      docId: 'doc-rel-001',
      fdrId: 'fdr-003',
      institutionId: 'INST105',
      releaseRequestId: 'rel-001',
      category: 'release_resolution',
      originalName: 'Governing_Body_Resolution_BMSCE.pdf',
      storedName: 'release_resolution_rel-001.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-105',
      uploadedAt: '2026-10-22T10:00:00Z',
      status: 'current',
      title: 'GOVERNING BODY RESOLUTION — SECURITY DEPOSIT RELEASE',
      sub: 'BMS College of Engineering • Resolution Ref: BMSCE/GB/2026/04',
      meta: {
        'Institution': 'BMS College of Engineering, Bengaluru',
        'Instrument Referenced': 'FDR-2026-5542 (HDFC Bank, ₹ 25,00,000)',
        'Regulatory Ground': 'Normative 5-year lock-in completed successfully',
        'Resolution Date': '18-Oct-2026',
        'Signatories': 'Principal & Member Secretary, Board of Governors'
      }
    },
    // Release Request 2 Supporting Resolution PDF
    {
      docId: 'doc-rel-002',
      fdrId: 'fdr-001',
      institutionId: 'INST102',
      releaseRequestId: 'rel-002',
      category: 'no_dues',
      originalName: 'VJTI_Audited_No_Dues_Certificate.pdf',
      storedName: 'no_dues_rel-002.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-102',
      uploadedAt: '2026-10-24T12:00:00Z',
      status: 'current',
      title: 'COMPREHENSIVE NO-DUES & AUDIT CLEARANCE ORDER',
      sub: 'VJTI Mumbai • Approval Bureau Western Regional Clearance',
      meta: {
        'Institution': 'Veermata Jijabai Technological Institute (VJTI)',
        'Instrument Referenced': 'FDR-2026-8801 (SBI, ₹ 35,00,000)',
        'Student Dues': 'NIL (Certified by Controller of Finance)',
        'Staff Salary Dues': 'NIL (Certified by Registrar)',
        'Court Injunctions': 'None Pending'
      }
    },
    // Release Request 3 Supporting Resolution PDF
    {
      docId: 'doc-rel-003',
      fdrId: 'fdr-004',
      institutionId: 'INST114',
      releaseRequestId: 'rel-003',
      category: 'release_resolution',
      originalName: 'DTU_Syndicate_Resolution_Deposit_Discharge.pdf',
      storedName: 'release_resolution_rel-003.pdf',
      version: 1,
      uploadedByRole: 'institution',
      uploadedByUserId: 'USR-INST-114',
      uploadedAt: '2026-10-26T14:00:00Z',
      status: 'current',
      title: 'DTU EXECUTIVE COUNCIL RESOLUTION FOR FDR DISCHARGE',
      sub: 'Delhi Technological University • Res. No. EC-48/2026',
      meta: {
        'Institution': 'Delhi Technological University (DTU)',
        'Instrument Referenced': 'FDR-2026-7719 (PNB, ₹ 40,00,000)',
        'Ground': 'Course closure approved by AICTE in 2025; all students graduated',
        'Authorized Signatory': 'Registrar, DTU'
      }
    }
  ];

  const insertDoc = db.prepare(`
    INSERT INTO documents (
      id, fdrId, institutionId, releaseRequestId, category, originalName, storedName,
      mimeType, sizeBytes, version, supersedesId, uploadedByRole, uploadedByUserId,
      uploadedAt, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const doc of sampleDocsDefs) {
    const fdrDir = path.resolve(UPLOADS_DIR, doc.fdrId);
    ensureDirectoryExists(fdrDir);
    const filePath = path.resolve(fdrDir, doc.storedName);
    
    const buf = createStyledPdf(doc.title, doc.sub, doc.meta, doc.note);
    fs.writeFileSync(filePath, buf);

    insertDoc.run(
      doc.docId,
      doc.fdrId,
      doc.institutionId,
      doc.releaseRequestId || null,
      doc.category,
      doc.originalName,
      doc.storedName,
      'application/pdf',
      buf.length,
      doc.version,
      doc.supersedesId || null,
      doc.uploadedByRole,
      doc.uploadedByUserId,
      doc.uploadedAt,
      doc.status
    );
  }

  // 3. Seed 3 Release Requests
  const initialReleaseRequests: ReleaseRequest[] = [
    {
      id: 'rel-001',
      fdrId: 'fdr-003',
      fdrNumber: 'FDR-2026-5542',
      institutionId: 'INST105',
      institutionName: 'BMS College of Engineering',
      principalAmount: 2500000,
      bankName: 'HDFC Bank',
      reason: 'Completion of 5-year lock-in period with full statutory and student fee clearance.',
      supportingDocName: 'Governing_Body_Resolution_BMSCE.pdf',
      requestDate: '2026-10-22',
      status: 'Requested',
    },
    {
      id: 'rel-002',
      fdrId: 'fdr-001',
      fdrNumber: 'FDR-2026-8801',
      institutionId: 'INST102',
      institutionName: 'Veermata Jijabai Technological Institute (VJTI)',
      principalAmount: 3500000,
      bankName: 'State Bank of India',
      reason: 'Discontinuation of discontinued postgraduate specialization and settlement of all liabilities.',
      supportingDocName: 'VJTI_Audited_No_Dues_Certificate.pdf',
      requestDate: '2026-10-24',
      status: 'Under Review',
      reviewedBy: 'Dr. Anand K. Srivastava',
      reviewDate: '2026-10-25',
      remarks: 'Under legal scrutiny of AICTE Finance & Accounts Bureau.',
    },
    {
      id: 'rel-003',
      fdrId: 'fdr-004',
      fdrNumber: 'FDR-2026-7719',
      institutionId: 'INST114',
      institutionName: 'Delhi Technological University (DTU)',
      principalAmount: 4000000,
      bankName: 'Punjab National Bank',
      reason: 'Course restructuring with statutory state government guarantee replacing FDR.',
      supportingDocName: 'DTU_Syndicate_Resolution_Deposit_Discharge.pdf',
      requestDate: '2026-10-26',
      status: 'Requested',
    }
  ];

  const insertRelease = db.prepare(`
    INSERT INTO release_requests (
      id, fdrId, fdrNumber, institutionId, institutionName, principalAmount, bankName,
      reason, supportingDocName, requestDate, status, reviewedBy, reviewDate, remarks
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of initialReleaseRequests) {
    insertRelease.run(
      r.id, r.fdrId, r.fdrNumber, r.institutionId, r.institutionName, r.principalAmount, r.bankName,
      r.reason, r.supportingDocName || null, r.requestDate, r.status, r.reviewedBy || null,
      r.reviewDate || null, r.remarks || null
    );
  }

  // 4. Seed Bank Confirmations (Section 8)
  const initialBankConfirmations: BankConfirmation[] = [
    {
      id: 'bc-001',
      fdrId: 'fdr-001',
      bankName: 'State Bank of India',
      requestedAt: '2026-10-18T10:35:00Z',
      respondedAt: null,
      status: 'requested',
      simulated: true,
      bankFields: {
        accountHolder: 'Veermata Jijabai Technological Institute (VJTI)',
        fdrNumber: 'FDR-2026-8801',
        principalAmount: 3500000,
        issueDate: '2026-09-15',
        maturityDate: '2029-09-15',
        branchName: 'Matunga, Mumbai',
        ifsc: 'SBIN0001107',
        lienMarkedInFavourOf: true,
        interestRate: 7.25,
        status: 'Active / Under Lien'
      }
    },
    {
      id: 'bc-002',
      fdrId: 'fdr-002',
      bankName: 'Bank of Baroda',
      requestedAt: '2026-10-24T11:00:00Z',
      respondedAt: '2026-10-24T11:15:32Z',
      status: 'mismatch',
      simulated: true,
      bankFields: {
        accountHolder: 'Veermata Jijabai Tech Inst (VJTI)',
        fdrNumber: 'FDR-2026-0148',
        principalAmount: 500000, // MISMATCH: 5 Lakhs vs 50 Lakhs claimed
        issueDate: '2026-04-09',
        maturityDate: '2026-11-16',
        branchName: 'Matunga Main, Mumbai',
        ifsc: 'BARB0MATUNG',
        lienMarkedInFavourOf: false, // MISMATCH: lien not marked
        interestRate: 6.80,
        status: 'Active'
      }
    },
    {
      id: 'bc-003',
      fdrId: 'fdr-003',
      bankName: 'HDFC Bank',
      requestedAt: null,
      respondedAt: null,
      status: 'not_requested',
      simulated: true,
      bankFields: {
        accountHolder: 'BMS College of Engineering',
        fdrNumber: 'FDR-2026-5542',
        principalAmount: 2500000,
        issueDate: '2026-08-01',
        maturityDate: '2029-08-01',
        branchName: 'Bull Temple Road, Bengaluru',
        ifsc: 'HDFC0000043',
        lienMarkedInFavourOf: true,
        interestRate: 7.10,
        status: 'Active'
      }
    },
    {
      id: 'bc-004',
      fdrId: 'fdr-004',
      bankName: 'Punjab National Bank',
      requestedAt: '2026-01-12T10:00:00Z',
      respondedAt: '2026-01-12T10:05:00Z',
      status: 'matched',
      simulated: true,
      bankFields: {
        accountHolder: 'Delhi Technological University (DTU)',
        fdrNumber: 'FDR-2026-7719',
        principalAmount: 4000000,
        issueDate: '2026-01-10',
        maturityDate: '2031-01-10',
        branchName: 'Rohini Sector 17, New Delhi',
        ifsc: 'PUNB0112200',
        lienMarkedInFavourOf: true,
        interestRate: 7.40,
        status: 'Under Lien'
      }
    },
    {
      id: 'bc-005',
      fdrId: 'fdr-005',
      bankName: 'Canara Bank',
      requestedAt: '2026-10-25T09:00:00Z',
      respondedAt: '2026-10-25T09:12:00Z',
      status: 'mismatch',
      simulated: true,
      bankFields: {
        accountHolder: 'PSG College of Technology',
        fdrNumber: 'FDR-2025-9920',
        principalAmount: 3000000,
        issueDate: '2023-11-20',
        maturityDate: '2026-10-20', // MISMATCH: 1 month earlier than claimed
        branchName: 'Peelamedu, Coimbatore',
        ifsc: 'CNRB0000881',
        lienMarkedInFavourOf: true,
        interestRate: 7.00,
        status: 'Matured'
      }
    },
    {
      id: 'bc-006',
      fdrId: 'fdr-006',
      bankName: 'ICICI Bank',
      requestedAt: '2026-10-15T10:00:00Z',
      respondedAt: '2026-10-15T10:10:00Z',
      status: 'matched',
      simulated: true,
      bankFields: {
        accountHolder: 'L.D. College of Engineering',
        fdrNumber: 'FDR-2026-1104-R',
        principalAmount: 2000000,
        issueDate: '2026-10-15',
        maturityDate: '2029-10-15',
        branchName: 'Navrangpura, Ahmedabad',
        ifsc: 'ICIC0000104',
        lienMarkedInFavourOf: true,
        interestRate: 7.30,
        status: 'Under Lien'
      }
    }
  ];

  const insertBankConfirm = db.prepare(`
    INSERT INTO bank_confirmations (
      id, fdrId, bankName, requestedAt, respondedAt, status, simulated, bankFields
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const bc of initialBankConfirmations) {
    (insertBankConfirm as any).run(
      bc.id, bc.fdrId, bc.bankName, bc.requestedAt, bc.respondedAt,
      bc.status, bc.simulated ? 1 : 0, JSON.stringify(bc.bankFields)
    );
  }

  // 5. Seed Notifications (Section 1)
  const initialNotifications = [
    {
      recipientRole: 'official' as const,
      recipientInstitutionId: null,
      fdrId: 'fdr-002',
      type: 'alert' as const,
      title: 'Discrepancy Action Required',
      message: 'FDR-2026-0148 (BOB) has an amount discrepancy flagged by AICTE scrutiny.',
      link: '/official/fdr/fdr-002',
    },
    {
      recipientRole: 'official' as const,
      recipientInstitutionId: null,
      fdrId: 'fdr-005',
      type: 'warning' as const,
      title: 'Maturity Alert (24 Days)',
      message: 'FDR-2025-9920 of PSG College of Technology reaches maturity on 20 Nov 2026.',
      link: '/official/reports',
    },
    {
      recipientRole: 'official' as const,
      recipientInstitutionId: null,
      fdrId: 'fdr-001',
      type: 'info' as const,
      title: 'New FDR Queued for Scrutiny',
      message: 'FDR-2026-8801 submitted by Veermata Jijabai Technological Institute (VJTI).',
      link: '/official/fdr/fdr-001',
    },
    {
      recipientRole: 'institution' as const,
      recipientInstitutionId: 'INST102',
      fdrId: 'fdr-002',
      type: 'alert' as const,
      title: 'AICTE Scrutiny: Amount Discrepancy Flagged',
      message: 'Bank API verified deposit of ₹ 5,00,000 versus entered ₹ 50,00,000. Please upload corrected receipt.',
      link: '/institution/dashboard',
    },
    {
      recipientRole: 'institution' as const,
      recipientInstitutionId: 'INST102',
      fdrId: 'fdr-001',
      type: 'info' as const,
      title: 'FDR Submission Acknowledged',
      message: 'FDR-2026-8801 (₹ 35,00,000) received and queued for electronic bank verification.',
      link: '/institution/dashboard',
    }
  ];

  for (const n of initialNotifications) {
    createNotification(n);
  }

  // 6. Seed Audit Logs
  const initialAuditEvents = [
    {
      fdrId: 'fdr-001',
      fdrNumber: 'FDR-2026-8801',
      performedBy: 'Dr. Ramesh Deshmukh (Registrar)',
      role: 'Institution' as const,
      action: 'INSTRUMENT_SUBMITTED',
      details: 'Uploaded SBI FDR Receipt for ₹ 35,00,000 with cross-verification consent.'
    },
    {
      fdrId: 'fdr-002',
      fdrNumber: 'FDR-2026-0148',
      performedBy: 'AICTE Core Bank Bridge',
      role: 'Bank System API' as const,
      action: 'BANK_API_POLL_MISMATCH',
      details: 'Bank API reported Principal Amount = ₹ 5,00,000, Lien = False. College declared ₹ 50,00,000.'
    },
    {
      fdrId: 'fdr-002',
      fdrNumber: 'FDR-2026-0148',
      performedBy: 'Dr. Anand K. Srivastava',
      role: 'AICTE Official' as const,
      action: 'DISCREPANCY_FLAGGED',
      details: 'Official flagged severe discrepancy in deposit sum. Discrepancy notice served to college.'
    },
    {
      fdrId: 'fdr-004',
      fdrNumber: 'FDR-2026-7719',
      performedBy: 'Dr. Anand K. Srivastava',
      role: 'AICTE Official' as const,
      action: 'INSTRUMENT_APPROVED',
      details: 'Bank confirmation matched 100%. Lien verification valid. Approved for regulatory compliance.'
    },
    {
      fdrId: 'fdr-006',
      fdrNumber: 'FDR-2026-1104-R',
      performedBy: 'L.D. College of Engineering',
      role: 'Institution' as const,
      action: 'INSTRUMENT_RENEWED',
      details: 'FDR renewed for 3 years with fresh ICICI Bank receipt.'
    }
  ];

  for (const a of initialAuditEvents) {
    writeAuditLog(a);
  }

  // 7. Seed Reminder Settings
  const defaultReminders: ReminderSettings = {
    reminder90Days: true,
    reminder60Days: true,
    reminder30Days: true,
    reminder15Days: true,
    emailAlerts: true,
    smsAlerts: false,
  };

  db.prepare(`INSERT OR REPLACE INTO reminder_settings (id, settings) VALUES (?, ?)`).run(
    'default',
    JSON.stringify(defaultReminders)
  );
}

// Data Access Helpers
export function getAllFDRs(): FDRRecord[] {
  const rows = db.prepare('SELECT * FROM fdrs ORDER BY updatedAt DESC').all() as any[];
  return rows.map(r => ({
    ...r,
    verificationConsent: Boolean(r.verificationConsent),
    renewalDue: Boolean(r.renewalDue),
    bankMatchSimulated: Boolean(r.bankMatchSimulated),
    bankData: r.bankData ? JSON.parse(r.bankData) : undefined,
  }));
}

export function getFDRById(id: string): FDRRecord | null {
  const r = db.prepare('SELECT * FROM fdrs WHERE id = ? OR fdrNumber = ?').get(id, id) as any;
  if (!r) return null;
  return {
    ...r,
    verificationConsent: Boolean(r.verificationConsent),
    renewalDue: Boolean(r.renewalDue),
    bankMatchSimulated: Boolean(r.bankMatchSimulated),
    bankData: r.bankData ? JSON.parse(r.bankData) : undefined,
  };
}

export function getDocumentsForFdr(fdrId: string): AppDocument[] {
  return db.prepare('SELECT * FROM documents WHERE fdrId = ? ORDER BY version DESC, uploadedAt DESC').all(fdrId) as any[];
}

export function getDocumentById(docId: string): AppDocument | null {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(docId) as any || null;
}

export function getAllReleaseRequests(): ReleaseRequest[] {
  return db.prepare('SELECT * FROM release_requests ORDER BY requestDate DESC').all() as any[];
}

export function getAllNotifications(role?: string, institutionId?: string): AppNotification[] {
  let query = 'SELECT * FROM notifications WHERE 1=1';
  const params: any[] = [];
  if (role) {
    query += ' AND (recipientRole = ?';
    params.push(role);
    if (role === 'institution' && institutionId) {
      query += ' AND (recipientInstitutionId = ? OR recipientInstitutionId IS NULL))';
      params.push(institutionId);
    } else {
      query += ')';
    }
  }
  query += ' ORDER BY createdAt DESC';
  return db.prepare(query).all(...params) as any[];
}

export function markNotificationRead(id: string) {
  db.prepare('UPDATE notifications SET readAt = ? WHERE id = ?').run(new Date().toISOString(), id);
}

export function markAllNotificationsRead(role?: string, institutionId?: string) {
  let query = 'UPDATE notifications SET readAt = ? WHERE readAt IS NULL';
  const params: any[] = [new Date().toISOString()];
  if (role) {
    query += ' AND recipientRole = ?';
    params.push(role);
    if (role === 'institution' && institutionId) {
      query += ' AND (recipientInstitutionId = ? OR recipientInstitutionId IS NULL)';
      params.push(institutionId);
    }
  }
  db.prepare(query).run(...params);
}

export function getAllBankConfirmations(): BankConfirmation[] {
  const rows = db.prepare('SELECT * FROM bank_confirmations').all() as any[];
  return rows.map(r => ({
    ...r,
    simulated: Boolean(r.simulated),
    bankFields: JSON.parse(r.bankFields),
  }));
}

export function getAllAuditLogs(): AuditLogEntry[] {
  return db.prepare('SELECT * FROM audit_logs ORDER BY rowid DESC').all() as any[];
}

export function getReminderSettings(): ReminderSettings {
  const r = db.prepare('SELECT settings FROM reminder_settings WHERE id = ?').get('default') as any;
  if (!r) {
    return {
      reminder90Days: true,
      reminder60Days: true,
      reminder30Days: true,
      reminder15Days: true,
      emailAlerts: true,
      smsAlerts: false,
    };
  }
  return JSON.parse(r.settings);
}

export function updateReminderSettings(settings: Partial<ReminderSettings>) {
  const current = getReminderSettings();
  const updated = { ...current, ...settings };
  db.prepare('INSERT OR REPLACE INTO reminder_settings (id, settings) VALUES (?, ?)').run('default', JSON.stringify(updated));
  return updated;
}
