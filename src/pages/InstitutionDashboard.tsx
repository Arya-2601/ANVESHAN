import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FDRRecord, ReleaseRequest, AppDocument } from '../types';
import { formatINR, formatDate, maskFdrNumber, getDaysUntilMaturity } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { DocumentViewerModal } from '../components/common/DocumentViewerModal';
import { DocumentsPanel } from '../components/common/DocumentsPanel';
import { api } from '../services/api';
import { 
  Building2, 
  PlusCircle, 
  ArrowUpRight, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  RefreshCw, 
  History, 
  UploadCloud, 
  X, 
  Eye, 
  Calendar,
  CreditCard,
  ShieldAlert,
  ChevronRight,
  Download,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const InstitutionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { 
    currentUser, 
    fdrList, 
    releaseRequests, 
    submitReleaseRequest, 
    updateFDRStatus, 
    maskFdrNumberState,
    refreshAll
  } = useApp();

  // Active view: 'instruments' or 'claims'
  const [activeTab, setActiveTab] = useState<'instruments' | 'claims'>('instruments');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');
  const [sortField, setSortField] = useState<'principalAmount' | 'maturityDate' | 'issueDate'>('maturityDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modals & Panels
  const [selectedFdrForTimeline, setSelectedFdrForTimeline] = useState<FDRRecord | null>(null);
  const [selectedFdrForResubmit, setSelectedFdrForResubmit] = useState<FDRRecord | null>(null);
  const [selectedFdrForVersionHistory, setSelectedFdrForVersionHistory] = useState<FDRRecord | null>(null);
  const [selectedFdrForDocs, setSelectedFdrForDocs] = useState<FDRRecord | null>(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [activeViewerDoc, setActiveViewerDoc] = useState<{ url: string; name: string; category?: string; version?: number } | null>(null);

  // Documents state for selected FDR
  const [fdrDocs, setFdrDocs] = useState<AppDocument[]>([]);
  const [isDocsLoading, setIsDocsLoading] = useState(false);

  // Release Request Modal Form State (Section 2.a)
  const [releaseFdrId, setReleaseFdrId] = useState('');
  const [releaseReason, setReleaseReason] = useState('');
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const [releaseFileError, setReleaseFileError] = useState('');
  const [isSubmittingRelease, setIsSubmittingRelease] = useState(false);

  // Resubmit Modal Form State (Section 4)
  const [resubmitFile, setResubmitFile] = useState<File | null>(null);
  const [resubmitFileError, setResubmitFileError] = useState('');
  const [resubmitClarification, setResubmitClarification] = useState('Attached revised scanned FDR receipt with explicit AICTE lien clause.');
  const [isSubmittingResubmit, setIsSubmittingResubmit] = useState(false);

  // Fetch documents whenever an FDR is selected for timeline or documents modal
  useEffect(() => {
    const target = selectedFdrForTimeline || selectedFdrForDocs;
    if (target) {
      setIsDocsLoading(true);
      api.getDocuments(target.id)
        .then(docs => setFdrDocs(docs))
        .catch(() => setFdrDocs([]))
        .finally(() => setIsDocsLoading(false));
    } else {
      setFdrDocs([]);
    }
  }, [selectedFdrForTimeline, selectedFdrForDocs]);

  // Filter FDRs for the logged in college (or INST102 default)
  const currentInstId = currentUser?.institutionId || 'INST102';
  const collegeFdrs = useMemo(() => {
    return fdrList.filter(f => f.institutionId === currentInstId);
  }, [fdrList, currentInstId]);

  const collegeReleases = useMemo(() => {
    return releaseRequests.filter(r => r.institutionId === currentInstId);
  }, [releaseRequests, currentInstId]);

  // KPIs
  const totalDeposited = useMemo(() => {
    return collegeFdrs
      .filter(f => f.status !== 'Released' && f.status !== 'Rejected')
      .reduce((sum, f) => sum + f.principalAmount, 0);
  }, [collegeFdrs]);

  const activeCount = collegeFdrs.filter(f => f.status === 'Active/Verified').length;
  const expiringOrMaturedCount = collegeFdrs.filter(f => f.status === 'Expiring Soon' || f.status === 'Matured').length;
  const releasedCount = collegeFdrs.filter(f => f.status === 'Released').length;

  // Discrepancy items for immediate alert banner
  const flaggedFdrs = useMemo(() => {
    return collegeFdrs.filter(f => f.status === 'Discrepancy Flagged');
  }, [collegeFdrs]);

  // Filtered & Sorted FDRs
  const filteredFdrs = useMemo(() => {
    return collegeFdrs.filter(f => {
      const matchSearch = 
        f.fdrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.branchIfsc.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || f.status === statusFilter;
      const matchBank = bankFilter === 'ALL' || f.bankName === bankFilter;

      return matchSearch && matchStatus && matchBank;
    }).sort((a, b) => {
      if (sortField === 'principalAmount') {
        return sortOrder === 'asc' ? a.principalAmount - b.principalAmount : b.principalAmount - a.principalAmount;
      }
      if (sortField === 'maturityDate') {
        return sortOrder === 'asc' 
          ? new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime()
          : new Date(b.maturityDate).getTime() - new Date(a.maturityDate).getTime();
      }
      return sortOrder === 'asc'
        ? new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
        : new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime();
    });
  }, [collegeFdrs, searchQuery, statusFilter, bankFilter, sortField, sortOrder]);

  const totalPages = Math.ceil(filteredFdrs.length / itemsPerPage) || 1;
  const paginatedFdrs = filteredFdrs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleReleaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!releaseFdrId) {
      toast.error('Select an eligible FDR for deposit release');
      return;
    }
    const targetFdr = collegeFdrs.find(f => f.id === releaseFdrId);
    if (!targetFdr) return;

    if (!releaseFile) {
      setReleaseFileError('Upload the supporting resolution / no-dues order (PDF) to continue');
      toast.error('Upload the supporting resolution / no-dues order (PDF) to continue');
      return;
    }
    if (releaseFile.type !== 'application/pdf' && !releaseFile.name.toLowerCase().endsWith('.pdf')) {
      setReleaseFileError('Only PDF format is permitted for supporting resolution / no-dues orders.');
      toast.error('Only PDF format is permitted');
      return;
    }
    if (releaseFile.size > 5 * 1024 * 1024) {
      setReleaseFileError('File size exceeds the 5 MB maximum limit.');
      toast.error('File size exceeds 5 MB limit');
      return;
    }

    try {
      setIsSubmittingRelease(true);
      const formData = new FormData();
      formData.append('fdrId', targetFdr.id);
      formData.append('fdrNumber', targetFdr.fdrNumber);
      formData.append('institutionId', targetFdr.institutionId);
      formData.append('institutionName', targetFdr.institutionName);
      formData.append('principalAmount', String(targetFdr.principalAmount));
      formData.append('bankName', targetFdr.bankName);
      formData.append('reason', releaseReason);
      formData.append('file', releaseFile);

      await submitReleaseRequest(formData);

      toast.success('Deposit release request submitted for official approval');
      setShowReleaseModal(false);
      setReleaseFdrId('');
      setReleaseReason('');
      setReleaseFile(null);
      setReleaseFileError('');
      setActiveTab('claims');
      await refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit release request');
    } finally {
      setIsSubmittingRelease(false);
    }
  };

  const handleResubmitCorrected = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFdrForResubmit) return;

    if (!resubmitFile) {
      setResubmitFileError('Upload the corrected FDR receipt (PDF) to continue');
      toast.error('Upload the corrected FDR receipt (PDF) to continue');
      return;
    }
    if (resubmitFile.type !== 'application/pdf' && !resubmitFile.name.toLowerCase().endsWith('.pdf')) {
      setResubmitFileError('Only PDF format is permitted.');
      toast.error('Only PDF format is permitted');
      return;
    }
    if (resubmitFile.size > 5 * 1024 * 1024) {
      setResubmitFileError('File size exceeds 5 MB limit.');
      toast.error('File size exceeds 5 MB limit');
      return;
    }

    try {
      setIsSubmittingResubmit(true);
      const formData = new FormData();
      formData.append('file', resubmitFile);
      formData.append('category', 'resubmission');
      formData.append('clarification', resubmitClarification);

      await api.uploadDocument(selectedFdrForResubmit.id, formData);

      toast.success('Corrected FDR document submitted! Returned to Scrutiny Queue.');
      setSelectedFdrForResubmit(null);
      setResubmitFile(null);
      setResubmitFileError('');
      await refreshAll();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit corrected document');
    } finally {
      setIsSubmittingResubmit(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* College Identity & Action Header */}
      <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(20,58,107,0.08)] border border-[#DCE6F2] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#143A6B]">
              {currentUser?.institutionName || 'Veermata Jijabai Technological Institute (VJTI)'}
            </h1>
            <span className="text-xs bg-[#F3F7FC] text-[#1D6BB5] font-mono font-medium px-2.5 py-0.5 rounded-full border border-[#DCE6F2]">
              {currentUser?.institutionId || 'INST102'}
            </span>
          </div>
          <p className="text-xs text-[#4A6280] mt-1">
            Autonomous State Technical Institute • AICTE Western Regional Bureau
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowReleaseModal(true)}
            className="min-h-[40px] px-4 py-2 border border-[#1D6BB5] text-[#1D6BB5] hover:bg-[#E3EEFB] font-semibold rounded-[8px] text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Request Deposit Release</span>
          </button>
          
          <button
            onClick={() => navigate('/institution/new-fdr')}
            className="min-h-[40px] px-4 py-2 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-[8px] text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Submit New FDR</span>
          </button>
        </div>
      </div>

      {/* Discrepancy Alert Notice (if any) */}
      {flaggedFdrs.length > 0 && (
        <div className="bg-[#FDECEA] border border-[#F0C4BF] border-l-4 border-l-[#B3261E] p-4 rounded-[12px] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-[#B3261E] mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-[#9F1D14]">
                  Attention Required: Discrepancy Flagged in {flaggedFdrs.length} Instrument(s)
                </h3>
                <p className="text-xs text-[#9F1D14] mt-0.5">
                  The AICTE Regulation Bureau has identified mismatched parameters with bank records. Please submit corrections immediately.
                </p>
                <div className="mt-2 space-y-1.5">
                  {flaggedFdrs.map(fdr => (
                    <div key={fdr.id} className="text-xs text-[#9F1D14] bg-white p-2.5 rounded-[8px] border border-[#F0C4BF] flex items-center justify-between">
                      <div>
                        <strong className="font-mono text-[#143A6B]">{fdr.fdrNumber} ({fdr.bankName}):</strong> {fdr.discrepancyRemarks || 'Data mismatch detected.'}
                      </div>
                      <button
                        onClick={() => setSelectedFdrForResubmit(fdr)}
                        className="ml-3 px-3 py-1 bg-[#B3261E] hover:bg-[#9F1D14] text-white font-semibold rounded-[8px] text-xs cursor-pointer shrink-0 min-h-[32px] transition-colors"
                      >
                        Resubmit Document
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deposited */}
        <div className="bg-white rounded-[12px] p-5 border border-[#DCE6F2] border-t-4 border-t-[#1D6BB5] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Total Deposited Amount
          </div>
          <div className="text-[30px] font-extrabold text-[#143A6B] mt-2 leading-tight">
            {formatINR(totalDeposited)}
          </div>
          <div className="text-xs text-[#4A6280] mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#0E6A06]" />
            <span>Under AICTE regulatory lien</span>
          </div>
        </div>

        {/* Active FDRs */}
        <div className="bg-white rounded-[12px] p-5 border border-[#DCE6F2] border-t-4 border-t-[#0E6A06] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Active Verified FDRs
          </div>
          <div className="text-[30px] font-extrabold text-[#0E6A06] mt-2 leading-tight">
            {activeCount}
          </div>
          <div className="text-xs text-[#4A6280] mt-1">
            Confirmed by issuing banks
          </div>
        </div>

        {/* Matured / Expiring */}
        <div className="bg-white rounded-[12px] p-5 border border-[#DCE6F2] border-t-4 border-t-[#B26A00] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Matured / Expiring Soon
          </div>
          <div className="text-[30px] font-extrabold text-[#7A4A00] mt-2 leading-tight">
            {expiringOrMaturedCount}
          </div>
          <div className="text-xs text-[#7A4A00] mt-1 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Renewal required within 90 days</span>
          </div>
        </div>

        {/* Refunded / Released */}
        <div className="bg-white rounded-[12px] p-5 border border-[#DCE6F2] border-t-4 border-t-[#4A6280] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Refunded / Released
          </div>
          <div className="text-[30px] font-extrabold text-[#4A6280] mt-2 leading-tight">
            {releasedCount}
          </div>
          <div className="text-xs text-[#4A6280] mt-1">
            Formally discharged by AICTE
          </div>
        </div>
      </div>

      {/* Main Tabs: Active Instruments vs Track Claims */}
      <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(20,58,107,0.08)] border border-[#DCE6F2] overflow-hidden">
        
        {/* Tab Switcher */}
        <div className="border-b border-[#DCE6F2] px-6 flex items-center justify-between bg-[#F3F7FC]">
          <div className="flex space-x-6">
            <button
              onClick={() => setActiveTab('instruments')}
              className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'instruments'
                  ? 'border-[#1D6BB5] text-[#1D6BB5]'
                  : 'border-transparent text-[#4A6280] hover:text-[#17324F]'
              }`}
            >
              Active Instruments ({collegeFdrs.length})
            </button>
            <button
              onClick={() => setActiveTab('claims')}
              className={`py-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'claims'
                  ? 'border-[#1D6BB5] text-[#1D6BB5]'
                  : 'border-transparent text-[#4A6280] hover:text-[#17324F]'
              }`}
            >
              Track Claims & Releases ({collegeReleases.length})
            </button>
          </div>

          <div className="text-xs text-[#4A6280] hidden sm:block">
            {activeTab === 'instruments' ? 'Showing institutional portfolio' : 'Deposit release requests'}
          </div>
        </div>

        {/* CONTENT FOR TAB 1: ACTIVE INSTRUMENTS */}
        {activeTab === 'instruments' && (
          <div className="p-6 space-y-4">
            
            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative sm:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-[#4A6280]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by FDR No., Bank, or IFSC..."
                  className="w-full pl-9 pr-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[38px] text-[#17324F]"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[38px] text-[#17324F]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Active/Verified">Active/Verified</option>
                  <option value="Pending Scrutiny">Pending Scrutiny</option>
                  <option value="Pending Bank Verification">Pending Bank Verification</option>
                  <option value="Discrepancy Flagged">Discrepancy Flagged</option>
                  <option value="Expiring Soon">Expiring Soon</option>
                  <option value="Matured">Matured</option>
                  <option value="Renewed">Renewed</option>
                  <option value="Released">Released</option>
                </select>
              </div>

              {/* Bank Filter */}
              <div>
                <select
                  value={bankFilter}
                  onChange={e => { setBankFilter(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[38px] text-[#17324F]"
                >
                  <option value="ALL">All Banks</option>
                  <option value="State Bank of India">State Bank of India</option>
                  <option value="HDFC Bank">HDFC Bank</option>
                  <option value="Bank of Baroda">Bank of Baroda</option>
                  <option value="Canara Bank">Canara Bank</option>
                  <option value="Punjab National Bank">Punjab National Bank</option>
                </select>
              </div>
            </div>

            {/* Instruments Table */}
            <div className="overflow-x-auto border border-[#DCE6F2] rounded-[8px]">
              <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
                <thead className="bg-[#F3F7FC]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">FDR Account No.</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Bank & Branch</th>
                    <th 
                      onClick={() => {
                        setSortField('principalAmount');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-4 py-3 text-right font-bold uppercase tracking-[0.8px] text-[#143A6B] cursor-pointer hover:text-[#1D6BB5]"
                    >
                      Principal Amount ↕
                    </th>
                    <th 
                      onClick={() => {
                        setSortField('maturityDate');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B] cursor-pointer hover:text-[#1D6BB5]"
                    >
                      Maturity Date ↕
                    </th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Status</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE6F2] bg-white">
                  {paginatedFdrs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-[#4A6280]">
                        No fixed deposit instruments match your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedFdrs.map(fdr => {
                      const daysLeft = getDaysUntilMaturity(fdr.maturityDate);
                      const isExpiring = daysLeft > 0 && daysLeft <= 90;

                      return (
                        <tr 
                          key={fdr.id} 
                          onClick={() => setSelectedFdrForTimeline(fdr)}
                          className="hover:bg-[#F3F8FD] transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">
                            <div className="flex items-center gap-1.5">
                              <span>{maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}</span>
                              {fdr.version > 1 && (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    setSelectedFdrForVersionHistory(fdr);
                                  }}
                                  className="text-[10px] bg-[#E3EEFB] text-[#1D6BB5] px-1.5 py-0.5 rounded font-sans font-bold hover:bg-[#DCE6F2]"
                                  title="View Version History"
                                >
                                  v{fdr.version}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#17324F]">{fdr.bankName}</div>
                            <div className="text-[11px] text-[#4A6280] font-mono font-medium">{fdr.branchIfsc}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#17324F]">
                            {formatINR(fdr.principalAmount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[#17324F] font-medium">{formatDate(fdr.maturityDate)}</div>
                            <div className="text-[10px] text-[#4A6280]">
                              Issued: {formatDate(fdr.issueDate)}
                            </div>
                            {isExpiring && (
                              <span className="text-[10px] font-bold text-[#7A4A00] block mt-0.5">
                                {daysLeft} days remaining
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <StatusBadge status={fdr.status} />
                              {fdr.renewalDue && (
                                <span className="text-[10px] font-bold bg-[#FFF1D6] text-[#7A4A00] px-2 py-0.5 rounded-full border border-[#B26A00]">
                                  Renewal Due
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Timeline Tracking */}
                              <button
                                onClick={() => setSelectedFdrForTimeline(fdr)}
                                className="p-1.5 text-[#4A6280] hover:text-[#1D6BB5] hover:bg-[#F3F7FC] rounded-[8px] cursor-pointer"
                                title="View Verification Timeline"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Documents & Versions (Section 3) */}
                              <button
                                onClick={() => setSelectedFdrForDocs(fdr)}
                                className="p-1.5 text-[#4A6280] hover:text-[#1D6BB5] hover:bg-[#F3F7FC] rounded-[8px] cursor-pointer"
                                title="View Uploaded Documents & Versions"
                              >
                                <FileText className="w-4 h-4 text-[#1D6BB5]" />
                              </button>

                              {/* Renewal Action if due */}
                              {(fdr.renewalDue || fdr.status === 'Expiring Soon' || fdr.status === 'Matured') && (
                                <button
                                  onClick={() => navigate('/institution/new-fdr', { state: { prefillFDR: fdr } })}
                                  className="px-2.5 py-1 bg-[#F5A623] hover:bg-[#B26A00] text-white font-semibold rounded-[8px] text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                  title="Submit Renewed FDR"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Renew</span>
                                </button>
                              )}

                              {/* Correct Discrepancy if flagged */}
                              {fdr.status === 'Discrepancy Flagged' && (
                                <button
                                  onClick={() => setSelectedFdrForResubmit(fdr)}
                                  className="px-2.5 py-1 bg-[#B3261E] hover:bg-[#9F1D14] text-white font-semibold rounded-[8px] text-[11px] transition-colors cursor-pointer shadow-xs"
                                >
                                  Resubmit
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between text-xs text-[#4A6280] pt-2">
              <div>
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFdrs.length)} of {filteredFdrs.length} records
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="min-h-[36px] px-3 py-1 border border-[#DCE6F2] rounded-[8px] bg-white hover:bg-[#F3F7FC] text-[#17324F] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-medium text-[#17324F]">Page {currentPage} of {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="min-h-[36px] px-3 py-1 border border-[#DCE6F2] rounded-[8px] bg-white hover:bg-[#F3F7FC] text-[#17324F] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>

          </div>
        )}

        {/* CONTENT FOR TAB 2: TRACK CLAIMS */}
        {activeTab === 'claims' && (
          <div className="p-6 space-y-4">
            <div className="border border-[#DCE6F2] rounded-[8px] overflow-x-auto">
              <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
                <thead className="bg-[#F3F7FC]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Request ID</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">FDR Account</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Bank</th>
                    <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.8px] text-[#143A6B]">Release Amount</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Request Date</th>
                    <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Workflow Stage</th>
                    <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Regulatory Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE6F2] bg-white">
                  {collegeReleases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#4A6280]">
                        No release requests submitted yet. Use "Request Deposit Release" above to submit a claim.
                      </td>
                    </tr>
                  ) : (
                    collegeReleases.map(rel => (
                      <tr key={rel.id} className="hover:bg-[#F3F8FD] transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">{rel.id}</td>
                        <td className="px-4 py-3 font-mono font-medium text-[#17324F]">{rel.fdrNumber}</td>
                        <td className="px-4 py-3 text-[#17324F]">{rel.bankName}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#0E6A06]">
                          {formatINR(rel.principalAmount)}
                        </td>
                        <td className="px-4 py-3 text-[#4A6280]">{formatDate(rel.requestDate)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={rel.status} />
                        </td>
                        <td className="px-4 py-3 text-[#4A6280] max-w-xs truncate">
                          {rel.remarks || rel.reason}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: Read-Only Verification Tracking Timeline (Section 5) */}
      {selectedFdrForTimeline && (() => {
        // Find stage-specific documents
        const submittedDoc = fdrDocs.find(d => d.category === 'fdr_scan');
        const verificationDoc = fdrDocs.find(d => d.category === 'resubmission');
        const renewalDoc = fdrDocs.find(d => d.category === 'renewal');
        const releaseDoc = fdrDocs.find(d => d.category === 'release_resolution' || d.category === 'no_dues');

        const stages = [
          {
            number: 1,
            title: '1. Primary Deposit Submission',
            desc: `Submitted on ${formatDate(selectedFdrForTimeline.createdAt)} by ${selectedFdrForTimeline.institutionName}`,
            status: 'Completed',
            isDone: true,
            docTitle: submittedDoc ? submittedDoc.originalName : 'Sample document: Submitted FDR scan',
            docUrl: submittedDoc ? `/api/documents/${submittedDoc.id}/file` : '/sample-docs/stage_submitted_placeholder.pdf',
            isReal: !!submittedDoc,
            docCategory: 'fdr_scan',
            version: submittedDoc?.version || 1
          },
          {
            number: 2,
            title: '2. Core Banking Electronic Verification',
            desc: selectedFdrForTimeline.status === 'Pending Bank Verification'
              ? 'Awaiting response from Core Banking Interface'
              : selectedFdrForTimeline.status === 'Discrepancy Flagged'
              ? `Discrepancy flagged: ${selectedFdrForTimeline.discrepancyRemarks}`
              : 'Reconciliation validated with bank core record',
            status: selectedFdrForTimeline.status === 'Pending Bank Verification' ? 'In Progress' : 'Verified',
            isDone: ['Active/Verified', 'Matured', 'Expiring Soon', 'Renewed', 'Released'].includes(selectedFdrForTimeline.status),
            docTitle: verificationDoc ? verificationDoc.originalName : 'Sample document: Bank confirmation (simulated)',
            docUrl: verificationDoc ? `/api/documents/${verificationDoc.id}/file` : '/sample-docs/stage_verification_placeholder.pdf',
            isReal: !!verificationDoc,
            docCategory: 'verification',
            version: verificationDoc?.version || 1
          },
          {
            number: 3,
            title: '3. Bureau Acceptance & Joint Lien Order',
            desc: ['Active/Verified', 'Matured', 'Expiring Soon', 'Renewed', 'Released'].includes(selectedFdrForTimeline.status)
              ? 'Joint lien in favour of AICTE accepted and confirmed'
              : 'Pending completion of regulatory scrutiny and bank match',
            status: ['Active/Verified', 'Matured', 'Expiring Soon', 'Renewed', 'Released'].includes(selectedFdrForTimeline.status) ? 'Accepted' : 'Pending',
            isDone: ['Active/Verified', 'Matured', 'Expiring Soon', 'Renewed', 'Released'].includes(selectedFdrForTimeline.status),
            docTitle: 'Sample document: Acceptance note',
            docUrl: '/sample-docs/stage_accepted_placeholder.pdf',
            isReal: false,
            docCategory: 'acceptance',
            version: 1
          },
          {
            number: 4,
            title: '4. Active Lock-in & Surveillance Monitoring',
            desc: selectedFdrForTimeline.status === 'Released'
              ? 'Lock-in period concluded; lien discharged'
              : selectedFdrForTimeline.status === 'Expiring Soon'
              ? 'Approaching maturity date; renewal required'
              : 'Under active compliance surveillance by AICTE Bureau',
            status: ['Active/Verified', 'Expiring Soon', 'Matured', 'Renewed'].includes(selectedFdrForTimeline.status) ? 'Active' : 'Pending',
            isDone: ['Active/Verified', 'Expiring Soon', 'Matured', 'Renewed', 'Released'].includes(selectedFdrForTimeline.status),
            docTitle: 'Sample document: Annual surveillance report',
            docUrl: '/sample-docs/stage_monitoring_placeholder.pdf',
            isReal: false,
            docCategory: 'monitoring',
            version: 1
          },
          {
            number: 5,
            title: '5. Term Renewal / Instrument Replacement',
            desc: selectedFdrForTimeline.status === 'Renewed' || selectedFdrForTimeline.fdrNumber.includes('-R')
              ? 'Renewal instrument endorsed for extended academic cycle'
              : 'Applicable when 5-year lock-in period requires extension',
            status: selectedFdrForTimeline.status === 'Renewed' ? 'Renewed' : 'Not Applicable',
            isDone: selectedFdrForTimeline.status === 'Renewed',
            docTitle: renewalDoc ? renewalDoc.originalName : 'Sample document: Renewal documents',
            docUrl: renewalDoc ? `/api/documents/${renewalDoc.id}/file` : '/sample-docs/stage_renewal_placeholder.pdf',
            isReal: !!renewalDoc,
            docCategory: 'renewal',
            version: renewalDoc?.version || 2
          },
          {
            number: 6,
            title: '6. Security Deposit Release & Discharge',
            desc: selectedFdrForTimeline.status === 'Released'
              ? 'Official discharge order signed by Member Secretary, AICTE'
              : 'Initiated upon course closure / no student dues verification',
            status: selectedFdrForTimeline.status === 'Released' ? 'Released' : 'Pending',
            isDone: selectedFdrForTimeline.status === 'Released',
            docTitle: releaseDoc ? releaseDoc.originalName : 'Sample document: Release resolution & no dues',
            docUrl: releaseDoc ? `/api/documents/${releaseDoc.id}/file` : '/sample-docs/stage_release_placeholder.pdf',
            isReal: !!releaseDoc,
            docCategory: 'release',
            version: 1
          }
        ];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
              <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#1D6BB5] text-white flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-bold">Verification & Lifecycle Timeline</h3>
                  <p className="text-xs text-blue-100 font-mono font-medium mt-0.5">
                    {selectedFdrForTimeline.fdrNumber} • {selectedFdrForTimeline.bankName} ({formatINR(selectedFdrForTimeline.principalAmount)})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFdrForTimeline(null)}
                  className="text-white/80 hover:text-white p-1 rounded-full cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-[#DCE6F2]">
                  {stages.map((stg) => (
                    <div key={stg.number} className="relative flex items-start space-x-4">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ring-4 ring-white ${
                        stg.isDone 
                          ? 'bg-[#0E6A06] text-white' 
                          : 'bg-[#DCE6F2] text-[#4A6280]'
                      }`}>
                        {stg.isDone ? '✓' : stg.number}
                      </div>

                      <div className="flex-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="font-bold text-[#143A6B] text-sm">{stg.title}</div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            stg.isDone ? 'bg-[#E6F4EA] text-[#0E6A06]' : 'bg-[#F1F5F9] text-[#64748B]'
                          }`}>
                            {stg.status}
                          </span>
                        </div>
                        <div className="text-[#4A6280] mt-0.5">{stg.desc}</div>

                        {/* Stage Specific Document Card */}
                        <div className="mt-2.5 p-3 rounded-[8px] bg-[#F8FAFD] border border-[#DCE6F2] flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-[#1D6BB5] shrink-0" />
                            <span className="font-medium text-[#17324F] truncate">{stg.docTitle}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              stg.isReal 
                                ? 'bg-[#E6F4EA] text-[#0E6A06] border border-[#138808]/30' 
                                : 'bg-[#FFF1D6] text-[#7A4A00] border border-[#B26A00]/30'
                            }`}>
                              {stg.isReal ? 'REAL UPLOADED' : 'DUMMY / SIMULATED'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setActiveViewerDoc({
                                url: stg.docUrl,
                                name: stg.docTitle,
                                category: stg.docCategory,
                                version: stg.version,
                              });
                            }}
                            className="px-3 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-[6px] text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Stage Document</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-3 border-t border-[#DCE6F2] bg-[#F3F7FC] flex justify-end shrink-0">
                <button
                  onClick={() => setSelectedFdrForTimeline(null)}
                  className="min-h-[40px] px-5 py-2 bg-[#143A6B] hover:bg-[#17324F] text-white text-xs font-semibold rounded-[8px] cursor-pointer transition-colors"
                >
                  Close Timeline
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: Request Deposit Release Form (Section 2.a) */}
      {showReleaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#1D6BB5] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Request Security Deposit Release</h3>
              <button
                onClick={() => setShowReleaseModal(false)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReleaseSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Select Eligible FDR Instrument <span className="text-[#B3261E]">*</span>
                </label>
                <select
                  required
                  value={releaseFdrId}
                  onChange={e => setReleaseFdrId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[38px] text-[#17324F]"
                >
                  <option value="">-- Choose an instrument --</option>
                  {collegeFdrs
                    .filter(f => f.status !== 'Released')
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.fdrNumber} — {f.bankName} ({formatINR(f.principalAmount)}) [Status: {f.status}]
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Regulatory Ground / Reason for Release <span className="text-[#B3261E]">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={releaseReason}
                  onChange={e => setReleaseReason(e.target.value)}
                  placeholder="e.g. Completion of mandatory 5-year lock-in period with no pending student dues..."
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F]"
                ></textarea>
              </div>

              {/* Supporting Resolution File Upload (Section 2.a: REQUIRED) */}
              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Upload Supporting Resolution / No Dues Order (PDF) <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  aria-invalid={!!releaseFileError}
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setReleaseFile(f);
                    if (f) {
                      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                        setReleaseFileError('Only PDF format is permitted for supporting resolution / no-dues orders.');
                      } else if (f.size > 5 * 1024 * 1024) {
                        setReleaseFileError('File size exceeds the 5 MB maximum limit.');
                      } else {
                        setReleaseFileError('');
                      }
                    }
                  }}
                  className={`w-full text-xs text-[#4A6280] file:mr-2 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:text-xs file:font-semibold file:bg-[#E3EEFB] file:text-[#1D6BB5] hover:file:bg-[#DCE6F2] p-1 rounded-[8px] border ${
                    releaseFileError ? 'border-[#B3261E] bg-[#FDECEA]/30' : 'border-[#DCE6F2]'
                  }`}
                />
                {releaseFileError && (
                  <p className="text-xs text-[#B3261E] mt-1.5 font-semibold flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{releaseFileError}</span>
                  </p>
                )}
                {releaseFile && !releaseFileError && (
                  <p className="text-xs text-[#0E6A06] mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Selected: {releaseFile.name} ({(releaseFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </p>
                )}
              </div>

              <div className="p-3.5 bg-[#FFF1D6] border-l-4 border-l-[#B26A00] border border-[#B26A00]/30 rounded-[8px] text-xs text-[#7A4A00]">
                Deposit release requires competent authority approval from the Member Secretary, AICTE.
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setShowReleaseModal(false)}
                  className="min-h-[40px] px-4 py-2 border border-[#DCE6F2] rounded-[8px] text-[#4A6280] hover:bg-[#F3F7FC] font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRelease}
                  className="min-h-[40px] px-5 py-2 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-[8px] text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingRelease ? 'Submitting...' : 'Submit Release Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Resubmit Corrected Document (Section 4) */}
      {selectedFdrForResubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-lg overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#1D6BB5] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Resubmit Corrected FDR Document</h3>
                <p className="text-xs text-blue-100 font-mono font-medium">{selectedFdrForResubmit.fdrNumber}</p>
              </div>
              <button
                onClick={() => setSelectedFdrForResubmit(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResubmitCorrected} className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-[#FDECEA] border-l-4 border-l-[#B3261E] border border-[#F0C4BF] rounded-[8px] text-xs text-[#9F1D14]">
                <strong>Official Discrepancy Remarks:</strong>
                <p className="mt-1">{selectedFdrForResubmit.discrepancyRemarks}</p>
              </div>

              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Upload Revised / Corrected FDR Receipt PDF <span className="text-[#B3261E]">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf"
                  aria-invalid={!!resubmitFileError}
                  onChange={e => {
                    const f = e.target.files?.[0] || null;
                    setResubmitFile(f);
                    if (f) {
                      if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
                        setResubmitFileError('Only PDF format is permitted for corrected receipts.');
                      } else if (f.size > 5 * 1024 * 1024) {
                        setResubmitFileError('File size exceeds the 5 MB maximum limit.');
                      } else {
                        setResubmitFileError('');
                      }
                    }
                  }}
                  className={`w-full text-xs text-[#4A6280] file:mr-2 file:py-1.5 file:px-3 file:rounded-[8px] file:border-0 file:text-xs file:font-semibold file:bg-[#E3EEFB] file:text-[#1D6BB5] hover:file:bg-[#DCE6F2] p-1 rounded-[8px] border ${
                    resubmitFileError ? 'border-[#B3261E] bg-[#FDECEA]/30' : 'border-[#DCE6F2]'
                  }`}
                />
                {resubmitFileError && (
                  <p className="text-xs text-[#B3261E] mt-1.5 font-semibold flex items-center gap-1 animate-fadeIn">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{resubmitFileError}</span>
                  </p>
                )}
                {resubmitFile && !resubmitFileError && (
                  <p className="text-xs text-[#0E6A06] mt-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Selected: {resubmitFile.name} ({(resubmitFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#17324F] mb-1">
                  Clarification Note to AICTE Regulation Bureau
                </label>
                <textarea
                  rows={3}
                  value={resubmitClarification}
                  onChange={e => setResubmitClarification(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F]"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#DCE6F2]">
                <button
                  type="button"
                  onClick={() => setSelectedFdrForResubmit(null)}
                  className="min-h-[40px] px-4 py-2 border border-[#DCE6F2] rounded-[8px] text-[#4A6280] hover:bg-[#F3F7FC] font-semibold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResubmit}
                  className="min-h-[40px] px-5 py-2 bg-[#B3261E] hover:bg-[#9F1D14] text-white font-semibold rounded-[8px] text-xs cursor-pointer shadow-xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingResubmit ? 'Uploading...' : 'Submit Corrected Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Documents & Versions Modal (Section 3) */}
      {selectedFdrForDocs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#1D6BB5] text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold">Documents & Versions — {selectedFdrForDocs.fdrNumber}</h3>
                <p className="text-xs text-blue-100 font-mono font-medium">{selectedFdrForDocs.bankName} • {formatINR(selectedFdrForDocs.principalAmount)}</p>
              </div>
              <button
                onClick={() => setSelectedFdrForDocs(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <DocumentsPanel
                documents={fdrDocs}
                fdrId={selectedFdrForDocs.id}
                fdrNumber={selectedFdrForDocs.fdrNumber}
                currentRole="institution"
                onReplaceResubmit={() => {
                  const target = selectedFdrForDocs;
                  setSelectedFdrForDocs(null);
                  setSelectedFdrForResubmit(target);
                }}
                isLoading={isDocsLoading}
              />
            </div>

            <div className="px-6 py-3 border-t border-[#DCE6F2] bg-[#F3F7FC] flex justify-end shrink-0">
              <button
                onClick={() => setSelectedFdrForDocs(null)}
                className="min-h-[40px] px-5 py-2 bg-[#143A6B] hover:bg-[#17324F] text-white text-xs font-semibold rounded-[8px] cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Version History Modal */}
      {selectedFdrForVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-xl overflow-hidden animate-scaleUp">
            <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#1D6BB5] text-white flex items-center justify-between">
              <h3 className="text-base font-bold">Instrument Renewal History (Old vs New)</h3>
              <button
                onClick={() => setSelectedFdrForVersionHistory(null)}
                className="text-white/80 hover:text-white p-1 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-[#F8FAFD] rounded-[8px] border border-[#DCE6F2]">
                  <div className="font-bold text-[#4A6280] uppercase tracking-wider mb-2">Version 1 (Original)</div>
                  <div className="space-y-1 text-[#17324F]">
                    <div>FDR No: <strong className="font-mono font-medium text-[#143A6B]">{selectedFdrForVersionHistory.fdrNumber.replace('-R', '')}</strong></div>
                    <div>Bank: {selectedFdrForVersionHistory.bankName}</div>
                    <div>Principal: {formatINR(selectedFdrForVersionHistory.principalAmount)}</div>
                    <div>Status: <span className="text-[#4A6280]">Replaced / Matured</span></div>
                  </div>
                </div>

                <div className="p-4 bg-[#E3EEFB]/40 rounded-[8px] border border-[#1D6BB5]/40">
                  <div className="font-bold text-[#1D6BB5] uppercase tracking-wider mb-2">Version 2 (Renewed)</div>
                  <div className="space-y-1 text-[#17324F]">
                    <div>FDR No: <strong className="font-mono font-medium text-[#143A6B]">{selectedFdrForVersionHistory.fdrNumber}</strong></div>
                    <div>Bank: {selectedFdrForVersionHistory.bankName}</div>
                    <div>Principal: {formatINR(selectedFdrForVersionHistory.principalAmount)}</div>
                    <div>Status: <span className="text-[#0E6A06] font-bold">Active / Renewed</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-[#DCE6F2] bg-[#F3F7FC] flex justify-end">
              <button
                onClick={() => setSelectedFdrForVersionHistory(null)}
                className="min-h-[40px] px-5 py-2 bg-[#143A6B] hover:bg-[#17324F] text-white text-xs font-semibold rounded-[8px] cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reusable Document Viewer Modal (Section 3) */}
      {activeViewerDoc && (
        <DocumentViewerModal
          isOpen={!!activeViewerDoc}
          onClose={() => setActiveViewerDoc(null)}
          documentUrl={activeViewerDoc.url}
          documentName={activeViewerDoc.name}
          category={activeViewerDoc.category}
          version={activeViewerDoc.version}
        />
      )}

    </div>
  );
};
