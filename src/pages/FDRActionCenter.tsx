import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatINR, formatDate, maskFdrNumber } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import { AppDocument } from '../types';
import { DocumentsPanel } from '../components/common/DocumentsPanel';
import { 
  ArrowLeft, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  RotateCw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  ShieldCheck, 
  FileText, 
  Database, 
  Building, 
  Lock, 
  History,
  X,
  Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

export const FDRActionCenter: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    fdrList, 
    updateFDRStatus, 
    simulateBankResponse, 
    auditLogs, 
    maskFdrNumberState, 
    currentUser 
  } = useApp();

  const fdr = fdrList.find(f => f.id === id || f.fdrNumber === id);

  // PDF Viewer Controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Bank Fetch Loading State
  const [isFetchingBank, setIsFetchingBank] = useState(false);

  // Action Panel State
  const [auditNotes, setAuditNotes] = useState(fdr?.internalAuditNotes || '');
  const [modalAction, setModalAction] = useState<'Approve' | 'Flag Discrepancy' | 'Reject' | null>(null);
  const [actionRemark, setActionRemark] = useState('');

  // Documents and version selection (Section 3)
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    if (fdr?.id) {
      api.getFdrDocuments(fdr.id).then((docs: AppDocument[]) => {
        setDocuments(docs);
        const scanDoc = docs.find((d: AppDocument) => d.status === 'current') || docs[0];
        if (scanDoc) setSelectedDocId(scanDoc.id);
      }).catch((err: any) => console.error('Failed to load docs for FDR', err));
    }
  }, [fdr?.id]);

  if (!fdr) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center">
        <h2 className="text-xl font-bold text-gray-800">FDR Record Not Found</h2>
        <p className="text-sm text-gray-500 mt-2">The requested instrument record could not be located.</p>
        <button
          onClick={() => navigate('/official/dashboard')}
          className="mt-4 px-4 py-2 bg-[#1F6FB5] text-white rounded text-xs font-semibold cursor-pointer"
        >
          Return to Official Dashboard
        </button>
      </div>
    );
  }

  const bank = fdr.bankData || {
    accountNumber: fdr.fdrNumber,
    bankName: fdr.bankName,
    branchIfsc: fdr.branchIfsc,
    principalAmount: fdr.principalAmount,
    issueDate: fdr.issueDate,
    maturityDate: fdr.maturityDate,
    lienMarkedToAICTE: true,
    interestRate: 7.25,
    statusInBank: 'Active' as const,
  };

  // Compare Field Helper
  const isMatch = (collegeVal: any, bankVal: any) => {
    if (typeof collegeVal === 'string' && typeof bankVal === 'string') {
      return collegeVal.trim().toUpperCase() === bankVal.trim().toUpperCase();
    }
    return collegeVal === bankVal;
  };

  const handleSimulateToggle = () => {
    simulateBankResponse(fdr.id);
    toast.success('Simulated bank core response toggled and cross-referenced!');
  };

  const handleFetchFromBank = () => {
    setIsFetchingBank(true);
    setTimeout(() => {
      setIsFetchingBank(false);
      toast.success('Live reconciliation response received from Core Banking Interface');
    }, 1200);
  };

  const handleConfirmAction = () => {
    if ((modalAction === 'Flag Discrepancy' || modalAction === 'Reject') && !actionRemark.trim()) {
      toast.error('A mandatory regulatory remark is required for this action');
      return;
    }

    if (modalAction === 'Approve') {
      updateFDRStatus(fdr.id, 'Active/Verified', actionRemark || 'Approved by AICTE Official after verifying bank confirmation and lien clause.', auditNotes);
      toast.success(`FDR ${fdr.fdrNumber} Approved & Regulatory Lien Confirmed!`);
    } else if (modalAction === 'Flag Discrepancy') {
      updateFDRStatus(fdr.id, 'Discrepancy Flagged', actionRemark, auditNotes);
      toast.error(`Discrepancy notice flagged for ${fdr.fdrNumber}. Served to college.`);
    } else if (modalAction === 'Reject') {
      updateFDRStatus(fdr.id, 'Rejected', actionRemark, auditNotes);
      toast.error(`FDR ${fdr.fdrNumber} rejected.`);
    }

    setModalAction(null);
    setTimeout(() => {
      navigate('/official/dashboard');
    }, 500);
  };

  // Related audit logs
  const relatedLogs = auditLogs.filter(l => l.fdrId === fdr.id || l.fdrNumber === fdr.fdrNumber);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* SECTION 7: Top Breadcrumb & Status Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#4A6280] mb-2">
          <Link to="/" className="text-[#1D6BB5] hover:underline font-semibold">Home</Link>
          <span>/</span>
          <Link to="/official/dashboard?tab=scrutiny" className="text-[#1D6BB5] hover:underline font-semibold">Scrutiny Queue</Link>
          <span>/</span>
          <span className="font-bold text-[#143A6B] font-mono">{maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F2] pb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/official/dashboard?tab=scrutiny')}
              className="p-2 text-[#4A6280] hover:text-[#143A6B] hover:bg-[#F3F7FC] rounded-[8px] cursor-pointer transition-colors"
              title="Back to queue"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#143A6B] font-mono">
                  {maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}
                </h1>
                <StatusBadge status={fdr.status} size="sm" />
                {fdr.version > 1 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#E3EEFB] text-[#1D6BB5] border border-[#1D6BB5]/40">
                    Resubmitted (v{fdr.version})
                  </span>
                )}
              </div>
              <p className="text-xs text-[#4A6280] mt-0.5">
                {fdr.institutionName} ({fdr.institutionId}) • State: {fdr.state}
              </p>
            </div>
          </div>

        {/* Live Simulation Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleFetchFromBank}
            disabled={isFetchingBank}
            className="min-h-[40px] px-4 py-2 border border-[#1D6BB5] text-[#1D6BB5] hover:bg-[#E3EEFB] text-xs font-semibold rounded-[8px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetchingBank ? 'animate-spin' : ''}`} />
            <span>{isFetchingBank ? 'Polling Bank...' : 'Fetch from Bank'}</span>
          </button>

          <button
            onClick={handleSimulateToggle}
            className={`min-h-[40px] px-4 py-2 text-xs font-semibold rounded-[8px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors ${
              fdr.bankMatchSimulated
                ? 'bg-[#FFF1D6] text-[#7A4A00] border border-[#B26A00] hover:bg-[#FFF1D6]/80'
                : 'bg-[#FDECEA] text-[#9F1D14] border border-[#F0C4BF] hover:bg-[#FDECEA]/80'
            }`}
            title="Toggle between bank match and discrepancy response"
          >
            <span>Simulate Bank API:</span>
            <strong>{fdr.bankMatchSimulated ? 'Match (Valid)' : 'Mismatch (Flagged)'}</strong>
          </button>
        </div>
      </div>
    </div>

      {/* SPLIT SCREEN WORKSPACE: Left = Dual-Data Grid, Right = PDF Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT PANEL: Dual-Data Comparison Grid */}
        <div className="space-y-6">
          <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#DCE6F2] bg-[#143A6B] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-blue-200" />
                <h2 className="text-sm font-bold">Dual-Data Comparison Grid</h2>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#1D6BB5] text-white">
                Cross-Verification Mode
              </span>
            </div>

            {/* Grid Legend & Instructions */}
            <div className="p-3.5 bg-[#F3F7FC] border-b border-[#DCE6F2] text-xs text-[#4A6280] flex items-center justify-between">
              <span>Comparing college submission vs bank authoritative record:</span>
              <div className="flex items-center space-x-3">
                <span className="inline-flex items-center text-[#0E6A06] font-semibold">
                  <CheckCircle className="w-3.5 h-3.5 mr-1 text-[#0E6A06]" /> Match
                </span>
                <span className="inline-flex items-center text-[#9F1D14] font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 text-[#B3261E]" /> Mismatch
                </span>
              </div>
            </div>

            {/* Comparison Rows */}
            <div className="divide-y divide-[#DCE6F2] text-xs">
              
              {/* Header Titles */}
              <div className="grid grid-cols-2 bg-[#F3F7FC] p-3 text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B]">
                <div className="text-left pr-2">Submitted by Institution</div>
                <div className="text-left pl-2 border-l border-[#DCE6F2]">
                  Independently Confirmed by Bank
                </div>
              </div>

              {/* Row 1: FDR Number */}
              {(() => {
                const match = isMatch(fdr.fdrNumber, bank.accountNumber);
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">FDR Account Number</span>
                      <span className="font-mono font-medium text-[#143A6B]">{fdr.fdrNumber}</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank CBS Account</span>
                        <span className="font-mono font-medium text-[#17324F]">{bank.accountNumber}</span>
                      </div>
                      {match ? <CheckCircle className="w-4 h-4 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

              {/* Row 2: Bank & Branch */}
              {(() => {
                const matchBank = isMatch(fdr.bankName, bank.bankName);
                const matchIfsc = isMatch(fdr.branchIfsc, bank.branchIfsc);
                const match = matchBank && matchIfsc;
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank & Branch IFSC</span>
                      <span className="font-semibold text-[#17324F]">{fdr.bankName}</span>
                      <span className="text-[10px] text-[#4A6280] font-mono font-medium block">{fdr.branchIfsc}</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank Master Registry</span>
                        <span className="font-semibold text-[#17324F]">{bank.bankName}</span>
                        <span className="text-[10px] text-[#4A6280] font-mono font-medium block">{bank.branchIfsc}</span>
                      </div>
                      {match ? <CheckCircle className="w-4 h-4 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

              {/* Row 3: Principal Amount (CRITICAL) */}
              {(() => {
                const match = fdr.principalAmount === bank.principalAmount;
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Claimed Principal Deposit</span>
                      <span className="text-lg font-extrabold text-[#143A6B]">{formatINR(fdr.principalAmount)}</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank Confirmed Principal</span>
                        <span className={`text-lg font-extrabold ${match ? 'text-[#0E6A06]' : 'text-[#9F1D14]'}`}>
                          {formatINR(bank.principalAmount)}
                        </span>
                        {!match && (
                          <span className="text-xs font-bold text-[#9F1D14] block mt-0.5">
                            DISCREPANCY: Difference of {formatINR(Math.abs(fdr.principalAmount - bank.principalAmount))}
                          </span>
                        )}
                      </div>
                      {match ? <CheckCircle className="w-5 h-5 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-5 h-5 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

              {/* Row 4: Issue Date */}
              {(() => {
                const match = isMatch(fdr.issueDate, bank.issueDate);
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Issue Date</span>
                      <span className="font-semibold text-[#17324F]">{formatDate(fdr.issueDate)}</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank Booking Date</span>
                        <span className="font-semibold text-[#17324F]">{formatDate(bank.issueDate)}</span>
                      </div>
                      {match ? <CheckCircle className="w-4 h-4 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

              {/* Row 5: Maturity Date */}
              {(() => {
                const match = isMatch(fdr.maturityDate, bank.maturityDate);
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Maturity Date</span>
                      <span className="font-semibold text-[#17324F]">{formatDate(fdr.maturityDate)}</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank Maturity Schedule</span>
                        <span className={`font-semibold ${match ? 'text-[#17324F]' : 'text-[#9F1D14]'}`}>
                          {formatDate(bank.maturityDate)}
                        </span>
                      </div>
                      {match ? <CheckCircle className="w-4 h-4 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-4 h-4 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

              {/* Row 6: Lien Clause to AICTE */}
              {(() => {
                const match = bank.lienMarkedToAICTE === true;
                return (
                  <div className={`grid grid-cols-2 p-3.5 transition-colors ${match ? 'hover:bg-[#F3F8FD]' : 'bg-[#FDECEA] border-l-4 border-l-[#B3261E]'}`}>
                    <div>
                      <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Mandatory Statutory Lien</span>
                      <span className="font-semibold text-[#143A6B]">In favour of Regional Directorate, AICTE</span>
                    </div>
                    <div className="border-l border-[#DCE6F2] pl-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#4A6280] block uppercase font-bold tracking-[0.8px]">Bank Lien Registration</span>
                        <span className={`font-bold ${match ? 'text-[#0E6A06]' : 'text-[#9F1D14]'}`}>
                          {bank.lienMarkedToAICTE ? 'Lien Active & Enforced' : 'MISSING / NOT MARKED'}
                        </span>
                      </div>
                      {match ? <CheckCircle className="w-5 h-5 text-[#0E6A06] shrink-0" /> : <AlertTriangle className="w-5 h-5 text-[#B3261E] shrink-0" />}
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

          {/* SCRUTINY ACTION PANEL */}
          <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] p-5 space-y-4">
            <h3 className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
              Scrutiny Decision & Audit Actions
            </h3>

            {/* Internal Audit Notes */}
            <div>
              <label className="block text-xs font-bold text-[#17324F] mb-1">
                Internal Audit & Verification Remarks (Logged with official digital signature)
              </label>
              <textarea
                rows={3}
                value={auditNotes}
                onChange={e => setAuditNotes(e.target.value)}
                placeholder="Enter confidential scrutiny remarks, cross-checks performed, or regulatory citations..."
                className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F]"
              ></textarea>
            </div>

            {/* Action Buttons: Approve / Flag Discrepancy / Reject */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModalAction('Approve');
                  setActionRemark('Cross-verification cleared. All parameters match bank confirmation.');
                }}
                className="min-h-[40px] py-2.5 px-4 bg-[#0E6A06] hover:bg-[#138808] text-white font-semibold rounded-[8px] text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Approve FDR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalAction('Flag Discrepancy');
                  setActionRemark(fdr.discrepancyRemarks || 'Mismatch detected in deposit value and lien registration with bank.');
                }}
                className="min-h-[40px] py-2.5 px-4 bg-[#F5A623] hover:bg-[#B26A00] text-white font-semibold rounded-[8px] text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Flag Discrepancy</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setModalAction('Reject');
                  setActionRemark('Non-compliant instrument. Rejected as per APH Chapter 1 norms.');
                }}
                className="min-h-[40px] py-2.5 px-4 bg-[#B3261E] hover:bg-[#9F1D14] text-white font-semibold rounded-[8px] text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <XCircle className="w-4 h-4" />
                <span>Reject</span>
              </button>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Embedded Document Viewer with Version Switcher & Documents Panel (Section 3) */}
        <div className="space-y-6">
          {(() => {
            const activeDoc = documents.find(d => d.id === selectedDocId) || documents[0];
            const activeDocUrl = activeDoc 
              ? `/api/documents/${activeDoc.id}/file` 
              : (fdr.documentUrl.startsWith('/') ? fdr.documentUrl : `/api/documents/${documents[0]?.id || 'doc-1'}/file`);

            return (
              <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] overflow-hidden">
                
                {/* PDF Viewer Toolbar */}
                <div className="px-4 py-2.5 border-b border-[#DCE6F2] bg-[#143A6B] text-white flex items-center justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="w-4 h-4 text-blue-200 shrink-0" />
                    <span className="text-xs font-semibold truncate">
                      {activeDoc?.originalName || fdr.documentName}
                    </span>
                    {activeDoc && (
                      <span className="text-[10px] bg-[#1D6BB5] text-white px-2 py-0.5 rounded-full font-mono font-bold">
                        v{activeDoc.version}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => setZoom(z => Math.max(50, z - 15))}
                      className="p-1 hover:bg-white/20 rounded-[8px] cursor-pointer transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-mono px-1">{zoom}%</span>
                    <button
                      onClick={() => setZoom(z => Math.min(180, z + 15))}
                      className="p-1 hover:bg-white/20 rounded-[8px] cursor-pointer transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRotation(r => (r + 90) % 360)}
                      className="p-1 hover:bg-white/20 rounded-[8px] cursor-pointer ml-1 transition-colors"
                      title="Rotate 90°"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    <a
                      href={activeDocUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 hover:bg-white/20 rounded-[8px] cursor-pointer ml-1 text-white transition-colors"
                      title="Open in new window"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                {/* Version Selector (Section 3 requirement) */}
                {documents.length > 0 && (
                  <div className="px-4 py-2 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between text-xs">
                    <span className="font-bold text-[#143A6B] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#1D6BB5]" />
                      <span>Select Scanned Version:</span>
                    </span>
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {documents.map(d => (
                        <button
                          key={d.id}
                          onClick={() => setSelectedDocId(d.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                            (activeDoc?.id === d.id)
                              ? 'bg-[#1D6BB5] text-white shadow-soft'
                              : 'bg-white text-[#17324F] hover:bg-[#E3EEFB] border border-[#DCE6F2]'
                          }`}
                        >
                          v{d.version} ({d.category === 'resubmission' ? 'Resubmission' : d.category === 'fdr_scan' ? 'Scan' : d.category})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PDF Frame */}
                <div className="h-[480px] bg-[#F3F7FC] overflow-auto flex items-center justify-center p-2 relative">
                  <div
                    className="transition-transform duration-200 origin-center bg-white shadow-md"
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      width: '100%',
                      height: '100%',
                    }}
                  >
                    <iframe
                      src={`${activeDocUrl}#toolbar=0&navpanes=0`}
                      title="FDR Document PDF Preview"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>

                {/* PDF Footer info */}
                <div className="px-4 py-2 border-t border-[#DCE6F2] bg-[#F3F7FC] text-xs text-[#4A6280] flex items-center justify-between">
                  <span>Security Deposit Scanned Certificate</span>
                  <span className="font-mono text-[11px] font-medium text-[#143A6B]">
                    Status: {activeDoc?.status === 'superseded' ? 'SUPERSEDED' : 'CURRENT ACTIVE'}
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Section 3: Official Documents Panel */}
          <DocumentsPanel
            documents={documents}
            fdrId={fdr.id}
            fdrNumber={fdr.fdrNumber}
            currentRole="official"
          />
        </div>

      </div>

      {/* AUDIT LOG TIMELINE AT BOTTOM (Immutable, Append-Only) */}
      <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#DCE6F2] pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#1D6BB5]" />
            <h3 className="text-sm font-bold text-[#143A6B]">
              Immutable Audit Log Trail (Instrument #{fdr.fdrNumber})
            </h3>
          </div>
          <span className="text-xs bg-[#F3F7FC] text-[#1D6BB5] px-2.5 py-0.5 rounded-full font-mono font-medium border border-[#DCE6F2]">
            Append-Only
          </span>
        </div>

        <div className="space-y-3">
          {relatedLogs.length === 0 ? (
            <div className="text-xs text-[#4A6280] italic py-2">
              Initial submission created. Awaiting first official verification audit log.
            </div>
          ) : (
            relatedLogs.map(log => (
              <div 
                key={log.id} 
                className="p-3.5 bg-[#F8FAFD] rounded-[8px] border border-[#DCE6F2] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#143A6B]">{log.action}</span>
                    <span className="text-[10px] bg-[#E3EEFB] text-[#1D6BB5] px-2 py-0.5 rounded-full font-semibold">
                      {((log.role as string) === 'Supervisor' || (log.role as string) === 'Officer' || (log.role as string) === 'AICTE Scrutiny Officer') ? 'AICTE Official' : log.role}
                    </span>
                    <span className="text-[#4A6280] font-mono text-[10px]">{log.timestamp}</span>
                  </div>
                  <p className="text-[#17324F] mt-1">{log.details}</p>
                </div>
                <div className="text-[10px] font-mono text-[#4A6280] shrink-0 text-right">
                  <div>Official: {log.performedBy}</div>
                  <div>Hash: {log.hash || 'e8b2f91a0c84'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CONFIRMATION ACTION MODAL */}
      {modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-md overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 bg-[#1D6BB5] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">
                Confirm {modalAction} Action
              </h3>
              <button
                onClick={() => setModalAction(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#17324F] leading-relaxed">
                You are about to execute <strong>{modalAction}</strong> on FDR instrument <strong className="font-mono text-[#143A6B]">{fdr.fdrNumber}</strong> for <strong>{fdr.institutionName}</strong>.
              </p>

              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Regulatory Remark / Decision Notice <span className="text-[#B3261E]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={actionRemark}
                  onChange={e => setActionRemark(e.target.value)}
                  placeholder="Enter specific regulatory reason or note to institution..."
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setModalAction(null)}
                  className="min-h-[40px] px-4 py-2 border border-[#DCE6F2] rounded-[8px] text-[#4A6280] hover:bg-[#F3F7FC] font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  className={`min-h-[40px] px-5 py-2 text-white font-semibold rounded-[8px] text-xs cursor-pointer shadow-xs transition-colors ${
                    modalAction === 'Approve' ? 'bg-[#0E6A06] hover:bg-[#138808]' :
                    modalAction === 'Flag Discrepancy' ? 'bg-[#F5A623] hover:bg-[#B26A00]' : 'bg-[#B3261E] hover:bg-[#9F1D14]'
                  }`}
                >
                  Confirm & Apply Decision
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
