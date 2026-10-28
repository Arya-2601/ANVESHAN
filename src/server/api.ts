import type { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { 
  db, 
  initDatabase, 
  seedDatabase, 
  getAllFDRs, 
  getFDRById, 
  getDocumentsForFdr, 
  getDocumentById, 
  getAllReleaseRequests, 
  getAllNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  getAllBankConfirmations, 
  getAllAuditLogs, 
  getReminderSettings, 
  updateReminderSettings, 
  writeAuditLog, 
  createNotification 
} from './db.ts';
import type { AppDocument } from '../types/index.ts';

initDatabase();

const UPLOADS_DIR = path.resolve(process.cwd(), 'data', 'uploads');

// Parse request body as JSON
async function readJsonBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf-8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// Parse request body as multipart/form-data using standard Node Request.formData()
async function readFormData(req: IncomingMessage): Promise<FormData> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const body = Buffer.concat(chunks);
  const init: any = {
    method: req.method,
    headers: req.headers as any,
    body: body,
    duplex: 'half',
  };
  const webReq = new Request('http://localhost' + (req.url || '/'), init);
  return await webReq.formData();
}

function sendJson(res: ServerResponse, statusCode: number, data: any) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });
  res.end(JSON.stringify(data));
}

function sendError(res: ServerResponse, statusCode: number, message: string) {
  sendJson(res, statusCode, { error: message });
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const pathname = urlObj.pathname;
  const method = req.method?.toUpperCase() || 'GET';

  // Role and institution headers for access control
  const userRole = (req.headers['x-user-role'] as string) || 'official';
  const userId = (req.headers['x-user-id'] as string) || (userRole === 'official' ? 'USR-AICTE-007' : 'USR-INST-102');
  const userName = (req.headers['x-user-name'] as string) || (userRole === 'official' ? 'AICTE Official' : 'Institution Registrar');
  const institutionId = (req.headers['x-institution-id'] as string) || 'INST102';

  try {
    // 1. NOTIFICATIONS
    if (pathname === '/api/notifications' && method === 'GET') {
      const roleFilter = urlObj.searchParams.get('role') || undefined;
      const instFilter = urlObj.searchParams.get('institutionId') || undefined;
      const notifications = getAllNotifications(roleFilter, instFilter);
      return sendJson(res, 200, notifications);
    }

    if (pathname.match(/^\/api\/notifications\/([^\/]+)\/read$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/notifications\/([^\/]+)\/read$/);
      const notifId = match![1];
      markNotificationRead(notifId);
      return sendJson(res, 200, { success: true, id: notifId });
    }

    if (pathname === '/api/notifications/read-all' && method === 'POST') {
      const body = await readJsonBody(req);
      markAllNotificationsRead(body.role || userRole, body.institutionId || institutionId);
      return sendJson(res, 200, { success: true });
    }

    // 2. FDRs
    if (pathname === '/api/fdrs' && method === 'GET') {
      const fdrs = getAllFDRs();
      return sendJson(res, 200, fdrs);
    }

    if (pathname === '/api/fdrs' && method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      let fields: any = {};
      let file: File | null = null;

      if (contentType.includes('multipart/form-data')) {
        const fd = await readFormData(req);
        fields = {
          fdrNumber: fd.get('fdrNumber') as string,
          institutionId: (fd.get('institutionId') as string) || institutionId,
          institutionName: (fd.get('institutionName') as string) || 'Institution',
          state: (fd.get('state') as string) || 'Maharashtra',
          bankName: fd.get('bankName') as string,
          branchIfsc: fd.get('branchIfsc') as string,
          principalAmount: Number(fd.get('principalAmount') || 0),
          issueDate: fd.get('issueDate') as string,
          maturityDate: fd.get('maturityDate') as string,
          verificationConsent: fd.get('verificationConsent') === 'true' || fd.get('verificationConsent') === '1',
          previousFdrId: fd.get('previousFdrId') as string || null,
        };
        file = fd.get('file') as File | null;
      } else {
        fields = await readJsonBody(req);
      }

      // SECTION 2.b: Upload scanned bank FDR is REQUIRED
      if (!file || typeof file === 'string' || file.size === 0) {
        return sendError(res, 422, 'Upload scanned bank FDR is required.');
      }

      const validMimes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
      const fileExt = path.extname(file.name).toLowerCase();
      const isValidExt = ['.pdf', '.png', '.jpg', '.jpeg'].includes(fileExt);

      if (!validMimes.includes(file.type) && !isValidExt) {
        return sendError(res, 422, 'Only PDF, PNG, and JPG files are accepted.');
      }

      if (file.size > 5 * 1024 * 1024) {
        return sendError(res, 422, 'File size exceeds maximum permitted limit of 5 MB.');
      }

      const fdrId = `fdr-${Date.now()}`;
      const nowISO = new Date().toISOString();
      const fdrDir = path.resolve(UPLOADS_DIR, fdrId);
      if (!fs.existsSync(fdrDir)) {
        fs.mkdirSync(fdrDir, { recursive: true });
      }

      const storedFileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.resolve(fdrDir, storedFileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, fileBytes);

      const docId = `doc-${Date.now()}`;
      const isRenewal = Boolean(fields.previousFdrId);
      const docCategory = isRenewal ? 'renewal' : 'fdr_scan';

      // Insert document
      db.prepare(`
        INSERT INTO documents (
          id, fdrId, institutionId, releaseRequestId, category, originalName, storedName,
          mimeType, sizeBytes, version, supersedesId, uploadedByRole, uploadedByUserId,
          uploadedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId, fdrId, fields.institutionId, null, docCategory, file.name, storedFileName,
        file.type || 'application/pdf', file.size, 1, null,
        userRole, userId, nowISO, 'current'
      );

      // Bank Data
      const bankData = {
        accountNumber: fields.fdrNumber,
        bankName: fields.bankName,
        branchIfsc: fields.branchIfsc,
        principalAmount: fields.principalAmount,
        issueDate: fields.issueDate,
        maturityDate: fields.maturityDate,
        lienMarkedToAICTE: true,
        interestRate: 7.25,
        statusInBank: 'Active',
      };

      // Insert FDR
      db.prepare(`
        INSERT INTO fdrs (
          id, fdrNumber, institutionId, institutionName, state, bankName, branchIfsc,
          principalAmount, issueDate, maturityDate, status, documentUrl, documentName, documentSize,
          verificationConsent, discrepancyRemarks, internalAuditNotes, renewalDue, previousFdrId,
          renewedFdrId, version, bankData, bankMatchSimulated, lastVerifiedDate, createdAt, updatedAt
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `).run(
        fdrId, fields.fdrNumber, fields.institutionId, fields.institutionName, fields.state,
        fields.bankName, fields.branchIfsc, fields.principalAmount, fields.issueDate, fields.maturityDate,
        'Pending Scrutiny', `/api/documents/${docId}/file`, file.name, `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        fields.verificationConsent ? 1 : 0, null, null, 0, fields.previousFdrId || null, null,
        1, JSON.stringify(bankData), 1, null, nowISO, nowISO
      );

      // Create Bank Confirmation Task
      const bcId = `bc-${Date.now()}`;
      db.prepare(`
        INSERT INTO bank_confirmations (
          id, fdrId, bankName, requestedAt, respondedAt, status, simulated, bankFields
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        bcId, fdrId, fields.bankName, null, null, 'not_requested', 1,
        JSON.stringify({
          accountHolder: fields.institutionName,
          fdrNumber: fields.fdrNumber,
          principalAmount: fields.principalAmount,
          issueDate: fields.issueDate,
          maturityDate: fields.maturityDate,
          branchName: fields.bankName + ' Branch',
          ifsc: fields.branchIfsc,
          lienMarkedInFavourOf: true,
          interestRate: 7.25,
          status: 'Active'
        })
      );

      // Write Audit Log
      writeAuditLog({
        fdrId,
        fdrNumber: fields.fdrNumber,
        performedBy: userName,
        role: 'Institution',
        action: isRenewal ? 'INSTRUMENT_RENEWED' : 'INSTRUMENT_SUBMITTED',
        details: `FDR ${fields.fdrNumber} submitted for ${fields.institutionName} (${fields.bankName}, ₹ ${fields.principalAmount.toLocaleString('en-IN')}). Scanned receipt uploaded.`
      });

      // SECTION 1.a: Institution submits a new FDR -> notify officials ("New FDR submitted, pending scrutiny")
      createNotification({
        recipientRole: 'official',
        fdrId,
        type: 'info',
        title: isRenewal ? 'FDR Renewal Submitted' : 'New FDR Queued for Scrutiny',
        message: `New FDR ${fields.fdrNumber} submitted by ${fields.institutionName}, pending scrutiny.`,
        link: `/official/fdr/${fdrId}`
      });

      return sendJson(res, 201, { success: true, id: fdrId, documentId: docId });
    }

    if (pathname.match(/^\/api\/fdrs\/([^\/]+)$/) && method === 'GET') {
      const match = pathname.match(/^\/api\/fdrs\/([^\/]+)$/);
      const fdrId = match![1];
      const fdr = getFDRById(fdrId);
      if (!fdr) return sendError(res, 404, 'FDR not found');
      return sendJson(res, 200, fdr);
    }

    // Status update
    if (pathname.match(/^\/api\/fdrs\/([^\/]+)\/status$/) && method === 'PATCH') {
      const match = pathname.match(/^\/api\/fdrs\/([^\/]+)\/status$/);
      const fdrId = match![1];
      const body = await readJsonBody(req);
      if (body.status !== 'Pending Scrutiny' && userRole !== 'official') {
        return sendError(res, 403, 'Forbidden: Official access required to alter instrument status.');
      }
      const fdr = getFDRById(fdrId);
      if (!fdr) return sendError(res, 404, 'FDR not found');

      const nowISO = new Date().toISOString();
      db.prepare(`
        UPDATE fdrs 
        SET status = ?, discrepancyRemarks = COALESCE(?, discrepancyRemarks),
            internalAuditNotes = COALESCE(?, internalAuditNotes), updatedAt = ?
        WHERE id = ?
      `).run(
        body.status, body.remarks !== undefined ? body.remarks : null,
        body.notes !== undefined ? body.notes : null, nowISO, fdrId
      );

      let actionLabel = 'STATUS_UPDATED';
      if (body.status === 'Active/Verified') actionLabel = 'INSTRUMENT_APPROVED';
      if (body.status === 'Discrepancy Flagged') actionLabel = 'DISCREPANCY_FLAGGED';
      if (body.status === 'Rejected') actionLabel = 'INSTRUMENT_REJECTED';
      if (body.status === 'Pending Scrutiny') actionLabel = 'DOCUMENT_RESUBMITTED';

      writeAuditLog({
        fdrId,
        fdrNumber: fdr.fdrNumber,
        performedBy: body.userName || userName,
        role: (body.userRole === 'official' ? 'AICTE Official' : 'Institution') as any,
        action: actionLabel,
        details: body.remarks ? `${actionLabel}: ${body.remarks}` : `Status updated to ${body.status}`
      });

      // SECTION 1.d: Official requests missing/corrected doc, flags discrepancy, or marks verified/rejected -> notify that institution
      if (userRole === 'official' || body.userRole === 'official') {
        let notifType: 'info' | 'warning' | 'alert' | 'success' = 'info';
        let notifTitle = `FDR ${fdr.fdrNumber} Status Updated`;

        if (body.status === 'Discrepancy Flagged') {
          notifType = 'alert';
          notifTitle = `Discrepancy Notice: FDR ${fdr.fdrNumber}`;
        } else if (body.status === 'Active/Verified') {
          notifType = 'success';
          notifTitle = `FDR ${fdr.fdrNumber} Verified & Approved`;
        } else if (body.status === 'Rejected') {
          notifType = 'alert';
          notifTitle = `FDR ${fdr.fdrNumber} Rejected`;
        }

        createNotification({
          recipientRole: 'institution',
          recipientInstitutionId: fdr.institutionId,
          fdrId: fdr.id,
          type: notifType,
          title: notifTitle,
          message: body.remarks || `Status changed to ${body.status} by AICTE Regulation Bureau.`,
          link: '/institution/dashboard'
        });
      }

      return sendJson(res, 200, { success: true, status: body.status });
    }

    // 3. DOCUMENTS (Section 3, 4)
    if (pathname.match(/^\/api\/fdrs\/([^\/]+)\/documents$/) && method === 'GET') {
      const match = pathname.match(/^\/api\/fdrs\/([^\/]+)\/documents$/);
      const fdrId = match![1];
      const docs = getDocumentsForFdr(fdrId);
      return sendJson(res, 200, docs);
    }

    if (pathname.match(/^\/api\/fdrs\/([^\/]+)\/documents$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/fdrs\/([^\/]+)\/documents$/);
      const fdrId = match![1];
      const fdr = getFDRById(fdrId);
      if (!fdr) return sendError(res, 404, 'FDR not found');

      const fd = await readFormData(req);
      const file = fd.get('file') as File | null;
      const category = (fd.get('category') as string || 'other') as AppDocument['category'];
      const releaseRequestId = fd.get('releaseRequestId') as string || null;
      const clarification = fd.get('clarification') as string || '';

      if (!file || typeof file === 'string' || file.size === 0) {
        return sendError(res, 422, 'Please select a valid document to upload.');
      }

      if (file.size > 5 * 1024 * 1024) {
        return sendError(res, 422, 'Uploaded file exceeds 5 MB limit.');
      }

      const fdrDir = path.resolve(UPLOADS_DIR, fdrId);
      if (!fs.existsSync(fdrDir)) {
        fs.mkdirSync(fdrDir, { recursive: true });
      }

      const storedFileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.resolve(fdrDir, storedFileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, fileBytes);

      // Check previous documents for this FDR to calculate version & superseding
      const prevDocs = getDocumentsForFdr(fdrId);
      const currentDoc = prevDocs.find((d: AppDocument) => d.status === 'current');
      const nextVersion = currentDoc ? currentDoc.version + 1 : prevDocs.length + 1;

      // Mark previous current doc as superseded
      if (currentDoc) {
        db.prepare('UPDATE documents SET status = ? WHERE id = ?').run('superseded', currentDoc.id);
      }

      const newDocId = `doc-${Date.now()}`;
      const nowISO = new Date().toISOString();

      db.prepare(`
        INSERT INTO documents (
          id, fdrId, institutionId, releaseRequestId, category, originalName, storedName,
          mimeType, sizeBytes, version, supersedesId, uploadedByRole, uploadedByUserId,
          uploadedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        newDocId, fdrId, fdr.institutionId, releaseRequestId, category, file.name, storedFileName,
        file.type || 'application/pdf', file.size, nextVersion, currentDoc ? currentDoc.id : null,
        userRole, userId, nowISO, 'current'
      );

      // Section 4: If resubmission or renewal, update FDR status back to 'Pending Scrutiny'
      if (category === 'resubmission' || category === 'renewal') {
        db.prepare(`
          UPDATE fdrs 
          SET status = 'Pending Scrutiny', version = ?, documentUrl = ?, documentName = ?,
              documentSize = ?, updatedAt = ?
          WHERE id = ?
        `).run(
          nextVersion, `/api/documents/${newDocId}/file`, file.name,
          `${(file.size / (1024 * 1024)).toFixed(1)} MB`, nowISO, fdrId
        );
      }

      // Write Audit Log
      writeAuditLog({
        fdrId,
        fdrNumber: fdr.fdrNumber,
        performedBy: userName,
        role: userRole === 'official' ? 'AICTE Official' : 'Institution',
        action: category === 'resubmission' ? 'DOCUMENT_RESUBMITTED' : 'DOCUMENT_UPLOADED',
        details: `${file.name} (v${nextVersion}, category: ${category}) uploaded by ${userName}.${clarification ? ` Note: ${clarification}` : ''}`
      });

      // SECTION 1.b: Institution uploads or replaces any document -> notify officials
      if (userRole === 'institution') {
        createNotification({
          recipientRole: 'official',
          fdrId,
          type: 'info',
          title: category === 'resubmission' ? 'Corrected Document Resubmitted' : 'New Document Attached',
          message: `${fdr.fdrNumber}: ${file.name} (v${nextVersion}) uploaded by ${fdr.institutionName}. Re-queued for scrutiny.`,
          link: `/official/fdr/${fdrId}`
        });
      }

      return sendJson(res, 201, {
        success: true,
        documentId: newDocId,
        version: nextVersion,
        url: `/api/documents/${newDocId}/file`
      });
    }

    // STREAM FILE WITH INLINE DISPOSITION & ROLE ACCESS (Section 3)
    if (pathname.match(/^\/api\/documents\/([^\/]+)\/file$/) && method === 'GET') {
      const match = pathname.match(/^\/api\/documents\/([^\/]+)\/file$/);
      const docId = match![1];
      const doc = getDocumentById(docId);
      if (!doc) {
        return sendError(res, 404, 'Document record not found');
      }

      // Enforce role access: officials can open any, an institution only its own
      if (userRole === 'institution' && institutionId && doc.institutionId !== institutionId) {
        return sendError(res, 403, 'Access denied. You can only view documents for your own institution.');
      }

      const filePath = path.resolve(UPLOADS_DIR, doc.fdrId, doc.storedName);
      if (!fs.existsSync(filePath)) {
        return sendError(res, 404, 'File not found on storage disk');
      }

      const stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': doc.mimeType || 'application/pdf',
        'Content-Length': stat.size,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        'Cache-Control': 'public, max-age=3600',
      });

      const stream = fs.createReadStream(filePath);
      return stream.pipe(res) as any;
    }

    // 4. RELEASE REQUESTS (Section 2.a, 9)
    if (pathname === '/api/release-requests' && method === 'GET') {
      const requests = getAllReleaseRequests();
      return sendJson(res, 200, requests);
    }

    if (pathname === '/api/release-requests' && method === 'POST') {
      const contentType = req.headers['content-type'] || '';
      let fields: any = {};
      let file: File | null = null;

      if (contentType.includes('multipart/form-data')) {
        const fd = await readFormData(req);
        fields = {
          fdrId: fd.get('fdrId') as string,
          fdrNumber: fd.get('fdrNumber') as string,
          institutionId: (fd.get('institutionId') as string) || institutionId,
          institutionName: (fd.get('institutionName') as string) || 'Institution',
          principalAmount: Number(fd.get('principalAmount') || 0),
          bankName: fd.get('bankName') as string,
          reason: fd.get('reason') as string,
        };
        file = fd.get('file') as File | null;
      } else {
        fields = await readJsonBody(req);
      }

      // SECTION 2.a: Supporting resolution / no-dues PDF is REQUIRED
      if (!file || typeof file === 'string' || file.size === 0) {
        return sendError(res, 422, 'Upload the supporting resolution / no-dues order (PDF) to continue');
      }

      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return sendError(res, 422, 'Only PDF documents are accepted for deposit release.');
      }

      if (file.size > 5 * 1024 * 1024) {
        return sendError(res, 422, 'File size exceeds maximum permitted limit of 5 MB.');
      }

      const reqId = `rel-${Date.now()}`;
      const nowISO = new Date().toISOString();
      const nowYMD = nowISO.split('T')[0];
      const fdrDir = path.resolve(UPLOADS_DIR, fields.fdrId);
      if (!fs.existsSync(fdrDir)) {
        fs.mkdirSync(fdrDir, { recursive: true });
      }

      const storedFileName = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const filePath = path.resolve(fdrDir, storedFileName);
      const fileBytes = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filePath, fileBytes);

      // Create document record for release resolution
      const docId = `doc-${Date.now()}`;
      db.prepare(`
        INSERT INTO documents (
          id, fdrId, institutionId, releaseRequestId, category, originalName, storedName,
          mimeType, sizeBytes, version, supersedesId, uploadedByRole, uploadedByUserId,
          uploadedAt, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        docId, fields.fdrId, fields.institutionId, reqId, 'release_resolution', file.name, storedFileName,
        'application/pdf', file.size, 1, null, userRole, userId, nowISO, 'current'
      );

      // Create release request record
      db.prepare(`
        INSERT INTO release_requests (
          id, fdrId, fdrNumber, institutionId, institutionName, principalAmount, bankName,
          reason, supportingDocName, requestDate, status, reviewedBy, reviewDate, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        reqId, fields.fdrId, fields.fdrNumber, fields.institutionId, fields.institutionName,
        fields.principalAmount, fields.bankName, fields.reason, file.name, nowYMD,
        'Requested', null, null, null
      );

      // Write Audit Log
      writeAuditLog({
        fdrId: fields.fdrId,
        fdrNumber: fields.fdrNumber,
        performedBy: userName,
        role: 'Institution',
        action: 'RELEASE_REQUESTED',
        details: `Deposit release requested for ${fields.fdrNumber}. Reason: ${fields.reason}. Supporting document: ${file.name}`
      });

      // SECTION 1.c: Institution submits a release request -> notify officials
      createNotification({
        recipientRole: 'official',
        fdrId: fields.fdrId,
        type: 'info',
        title: 'Security Deposit Release Requested',
        message: `${fields.institutionName} requested release of FDR ${fields.fdrNumber} (₹ ${fields.principalAmount.toLocaleString('en-IN')}).`,
        link: '/official/dashboard'
      });

      return sendJson(res, 201, { success: true, id: reqId });
    }

    // Review decision for release request (Section 9)
    if (pathname.match(/^\/api\/release-requests\/([^\/]+)$/) && method === 'PATCH') {
      if (userRole !== 'official') {
        return sendError(res, 403, 'Forbidden: Official access required to review release petitions.');
      }
      const match = pathname.match(/^\/api\/release-requests\/([^\/]+)$/);
      const reqId = match![1];
      const body = await readJsonBody(req);
      const action = body.action as 'approve' | 'hold' | 'reject';
      const remarks = body.remarks as string || '';

      // Validation of remarks length (min 10 for approve, min 15 for hold/reject)
      if (action === 'approve' && remarks.trim().length < 10) {
        return sendError(res, 422, 'A regulatory remark of at least 10 characters is required for release approval.');
      }
      if ((action === 'hold' || action === 'reject') && remarks.trim().length < 15) {
        return sendError(res, 422, 'A regulatory justification of at least 15 characters is required.');
      }

      const reqRow = db.prepare('SELECT * FROM release_requests WHERE id = ?').get(reqId) as any;
      if (!reqRow) return sendError(res, 404, 'Release request not found');

      const nowYMD = new Date().toISOString().split('T')[0];
      let newReqStatus = 'Requested';
      let auditAction = 'RELEASE_REVIEWED';

      if (action === 'approve') {
        newReqStatus = 'Approved';
        auditAction = 'DEPOSIT_RELEASED';
      } else if (action === 'hold') {
        newReqStatus = 'Under Review';
        auditAction = 'RELEASE_HELD';
      } else if (action === 'reject') {
        newReqStatus = 'Rejected';
        auditAction = 'RELEASE_REJECTED';
      }

      db.prepare(`
        UPDATE release_requests 
        SET status = ?, reviewedBy = ?, reviewDate = ?, remarks = ?
        WHERE id = ?
      `).run(newReqStatus, body.userName || userName, nowYMD, remarks, reqId);

      if (action === 'approve') {
        db.prepare(`
          UPDATE fdrs 
          SET status = 'Released', discrepancyRemarks = ?, updatedAt = ?
          WHERE id = ?
        `).run(remarks, new Date().toISOString(), reqRow.fdrId);
      }

      writeAuditLog({
        fdrId: reqRow.fdrId,
        fdrNumber: reqRow.fdrNumber,
        performedBy: body.userName || userName,
        role: 'AICTE Official',
        action: auditAction,
        details: `Release request for ${reqRow.fdrNumber} ${action}d. Remarks: ${remarks}`
      });

      // SECTION 1.e: Official approves, holds or rejects a release request -> notify that institution with the reason
      createNotification({
        recipientRole: 'institution',
        recipientInstitutionId: reqRow.institutionId,
        fdrId: reqRow.fdrId,
        type: action === 'approve' ? 'success' : action === 'hold' ? 'warning' : 'alert',
        title: `Release Request ${action.toUpperCase()}D: FDR ${reqRow.fdrNumber}`,
        message: `Decision: ${action.toUpperCase()}. Reason: ${remarks}`,
        link: '/institution/dashboard'
      });

      return sendJson(res, 200, { success: true, status: newReqStatus });
    }

    // 5. BANK VERIFICATIONS (Section 8)
    if (pathname === '/api/bank-confirmations' && method === 'GET') {
      const list = getAllBankConfirmations();
      return sendJson(res, 200, list);
    }

    if (pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/request$/) && method === 'POST') {
      if (userRole !== 'official') {
        return sendError(res, 403, 'Forbidden: Official access required.');
      }
      const match = pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/request$/);
      const bcId = match![1];
      const nowISO = new Date().toISOString();

      db.prepare(`
        UPDATE bank_confirmations 
        SET status = 'requested', requestedAt = ?
        WHERE id = ?
      `).run(nowISO, bcId);

      const bc = db.prepare('SELECT * FROM bank_confirmations WHERE id = ?').get(bcId) as any;
      if (bc) {
        db.prepare('UPDATE fdrs SET status = ? WHERE id = ?').run('Pending Bank Verification', bc.fdrId);
        const fdr = getFDRById(bc.fdrId);
        writeAuditLog({
          fdrId: bc.fdrId,
          fdrNumber: fdr?.fdrNumber || bc.fdrId,
          performedBy: userName,
          role: 'AICTE Official',
          action: 'BANK_VERIFICATION_REQUESTED',
          details: `Simulated electronic lien confirmation requested from ${bc.bankName}.`
        });
      }

      return sendJson(res, 200, { success: true, status: 'requested' });
    }

    if (pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/simulate-response$/) && method === 'POST') {
      const match = pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/simulate-response$/);
      const bcId = match![1];
      const bc = db.prepare('SELECT * FROM bank_confirmations WHERE id = ?').get(bcId) as any;
      if (!bc) return sendError(res, 404, 'Bank confirmation not found');

      const nowISO = new Date().toISOString();
      const fields = JSON.parse(bc.bankFields);
      const fdr = getFDRById(bc.fdrId);

      // Check if fields match college record
      const isMatched = fdr && 
        fields.fdrNumber.trim().toUpperCase() === fdr.fdrNumber.trim().toUpperCase() &&
        fields.principalAmount === fdr.principalAmount &&
        fields.lienMarkedInFavourOf === true &&
        fields.ifsc.trim().toUpperCase() === fdr.branchIfsc.trim().toUpperCase();

      const newStatus = isMatched ? 'matched' : 'mismatch';

      db.prepare(`
        UPDATE bank_confirmations 
        SET status = ?, respondedAt = ?
        WHERE id = ?
      `).run(newStatus, nowISO, bcId);

      writeAuditLog({
        fdrId: bc.fdrId,
        fdrNumber: fdr?.fdrNumber || bc.fdrId,
        performedBy: 'Bank System API (Simulated)',
        role: 'Bank System API',
        action: isMatched ? 'BANK_CONFIRMATION_MATCHED' : 'BANK_CONFIRMATION_MISMATCH',
        details: isMatched 
          ? `Bank electronic record confirmed 100% match. Lien marked to AICTE.`
          : `Bank API returned mismatch: Amount/IFSC/Lien variance detected.`
      });

      return sendJson(res, 200, { success: true, status: newStatus });
    }

    if (pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/mark-verified$/) && method === 'POST') {
      if (userRole !== 'official') {
        return sendError(res, 403, 'Forbidden: Official access required.');
      }
      const match = pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/mark-verified$/);
      const bcId = match![1];
      const bc = db.prepare('SELECT * FROM bank_confirmations WHERE id = ?').get(bcId) as any;
      if (!bc) return sendError(res, 404, 'Confirmation record not found');

      if (bc.status !== 'matched') {
        return sendError(res, 400, 'Cannot mark verified: Bank records have unresolved mismatches or are not yet received.');
      }

      const fdr = getFDRById(bc.fdrId);
      const nowYMD = new Date().toISOString().split('T')[0];

      db.prepare(`
        UPDATE fdrs 
        SET status = 'Active/Verified', lastVerifiedDate = ?, updatedAt = ?
        WHERE id = ?
      `).run(nowYMD, new Date().toISOString(), bc.fdrId);

      writeAuditLog({
        fdrId: bc.fdrId,
        fdrNumber: fdr?.fdrNumber || bc.fdrId,
        performedBy: userName,
        role: 'AICTE Official',
        action: 'INSTRUMENT_APPROVED',
        details: `FDR ${fdr?.fdrNumber} marked verified after matching bank confirmation record.`
      });

      createNotification({
        recipientRole: 'institution',
        recipientInstitutionId: fdr?.institutionId,
        fdrId: bc.fdrId,
        type: 'success',
        title: `FDR ${fdr?.fdrNumber} Electronic Verification Complete`,
        message: `Core Banking Confirmation validated. Joint lien with AICTE officially recognized.`,
        link: '/institution/dashboard'
      });

      return sendJson(res, 200, { success: true, status: 'Active/Verified' });
    }

    if (pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/discrepancy$/) && method === 'POST') {
      if (userRole !== 'official') {
        return sendError(res, 403, 'Forbidden: Official access required.');
      }
      const match = pathname.match(/^\/api\/bank-confirmations\/([^\/]+)\/discrepancy$/);
      const paramId = match![1];
      const body = await readJsonBody(req);
      
      let bc = db.prepare('SELECT * FROM bank_confirmations WHERE id = ?').get(paramId) as any;
      if (!bc) {
        bc = db.prepare('SELECT * FROM bank_confirmations WHERE fdrId = ?').get(paramId) as any;
      }
      const targetFdrId = bc ? bc.fdrId : paramId;
      const fdr = getFDRById(targetFdrId);
      if (!fdr) return sendError(res, 404, 'FDR instrument record not found');

      const reason = body.reason || 'Parameter mismatch flagged during bank reconciliation';
      const remarks = body.remarks || 'Official regulatory review identified discrepancy.';
      const combinedRemarks = `[${reason}] ${remarks}`;

      db.prepare(`
        UPDATE fdrs 
        SET status = 'Discrepancy Flagged', discrepancyRemarks = ?, updatedAt = ?
        WHERE id = ?
      `).run(combinedRemarks, new Date().toISOString(), targetFdrId);

      if (bc) {
        db.prepare(`UPDATE bank_confirmations SET status = 'mismatch' WHERE id = ?`).run(bc.id);
      } else {
        const newBcId = 'bc-' + Date.now();
        db.prepare(`
          INSERT INTO bank_confirmations (id, fdrId, status, requestedAt, responseReceivedAt)
          VALUES (?, ?, 'mismatch', ?, ?)
        `).run(newBcId, targetFdrId, new Date().toISOString(), new Date().toISOString());
      }

      writeAuditLog({
        fdrId: targetFdrId,
        fdrNumber: fdr.fdrNumber,
        performedBy: userName || 'AICTE Regulation Bureau',
        role: 'AICTE Official',
        action: 'DISCREPANCY_FLAGGED',
        details: `Discrepancy raised from Bank Verification screen. Ground: ${reason}. Remarks: ${remarks}`
      });

      createNotification({
        recipientRole: 'institution',
        recipientInstitutionId: fdr.institutionId,
        fdrId: targetFdrId,
        type: 'alert',
        title: `Regulatory Notice: Discrepancy Flagged on FDR ${fdr.fdrNumber}`,
        message: `Regulatory notice served to ${fdr.institutionName}. Reason: ${reason}. Remarks: ${remarks}`,
        link: '/institution/dashboard'
      });

      createNotification({
        recipientRole: 'official',
        fdrId: targetFdrId,
        type: 'alert',
        title: `Regulatory Notice Served: FDR ${fdr.fdrNumber}`,
        message: `Regulatory notice served to ${fdr.institutionName}. Reason: ${reason}.`,
        link: '/official/dashboard?tab=bank-verify'
      });

      return sendJson(res, 200, { success: true });
    }

    // 6. AUDIT LOGS
    if (pathname === '/api/audit-logs' && method === 'GET') {
      const logs = getAllAuditLogs();
      return sendJson(res, 200, logs);
    }

    // 7. REMINDER SETTINGS
    if (pathname === '/api/reminders' && method === 'GET') {
      const rem = getReminderSettings();
      return sendJson(res, 200, rem);
    }

    if (pathname === '/api/reminders' && method === 'PUT') {
      const body = await readJsonBody(req);
      const updated = updateReminderSettings(body);
      return sendJson(res, 200, updated);
    }

    // 8. RESET DATA
    if (pathname === '/api/reset' && method === 'POST') {
      seedDatabase();
      return sendJson(res, 200, { success: true, message: 'Database reset to initial factory state.' });
    }

    // Fallthrough 404
    return sendError(res, 404, `API route not found: ${method} ${pathname}`);
  } catch (err: any) {
    console.error('API Error:', err);
    return sendError(res, 500, err?.message || 'Internal server error');
  }
}
