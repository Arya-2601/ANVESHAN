import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FDRRecord, ReleaseRequest, AppDocument } from '../types';
import { formatINR, formatDate, maskFdrNumber, getDaysUntilMaturity } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { api } from '../services/api';
import { DocumentsPanel } from '../components/common/DocumentsPanel';
import { DocumentViewerModal } from '../components/common/DocumentViewerModal';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip as RechartsTooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  Building, 
  ArrowUpRight, 
  FileBarChart, 
  History, 
  Clock, 
  Search, 
  ChevronRight, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ArrowLeft,
  Eye,
  FileText,
  RotateCw,
  RefreshCw,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export const OfficialDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { 
    fdrList, 
    releaseRequests, 
    reviewReleaseRequest,
    bankConfirmations,
    requestBankConfirmation,
    simulateBankResponse,
    markBankVerified,
    raiseBankDiscrepancy,
    updateFDRStatus,
    maskFdrNumberState,
    currentUser
  } = useApp();

  // Active workspace tab: 'overview' | 'scrutiny' | 'bank-verify' | 'release-requests'
  const initialTab = (searchParams.get('tab') as any) || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'scrutiny' | 'bank-verify' | 'release-requests'>(
    ['overview', 'scrutiny', 'bank-verify', 'release-requests'].includes(initialTab) ? initialTab : 'overview'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'scrutiny', 'bank-verify', 'release-requests'].includes(tab)) {
      setActiveTab(tab as any);
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const handleTabChange = (tab: 'overview' | 'scrutiny' | 'bank-verify' | 'release-requests') => {
    setActiveTab(tab);
    if (tab === 'overview') {
      searchParams.delete('tab');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ tab });
    }
  };


  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState('ALL');
  const [bankFilter, setBankFilter] = useState('ALL');

  // Section 8: Bank Verification state
  const [bankTab, setBankTab] = useState<'requested' | 'matched' | 'mismatch' | 'not_requested'>('requested');
  const [selectedBankFdrId, setSelectedBankFdrId] = useState<string | null>(null);
  const [bankActionModal, setBankActionModal] = useState<{
    type: 'discrepancy' | 'corrected_doc';
    fdrId: string;
    fdrNumber: string;
    bcId?: string;
    institutionName?: string;
  } | null>(null);
  const [bankActionReason, setBankActionReason] = useState('');
  const [bankActionRemarks, setBankActionRemarks] = useState('');
  const [bankActionErrors, setBankActionErrors] = useState<{ reason?: string; remarks?: string }>({});
  const [isSubmittingBankAction, setIsSubmittingBankAction] = useState(false);

  // Section 9: Release Request Review & Confirmation state
  const [selectedReleaseRequest, setSelectedReleaseRequest] = useState<ReleaseRequest | null>(null);
  const reviewButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const lastActiveReviewReqId = React.useRef<string | null>(null);
  const [confirmModalData, setConfirmModalData] = useState<{
    request: ReleaseRequest;
    action: 'approve' | 'hold' | 'reject';
  } | null>(null);
  const [confirmRemarks, setConfirmRemarks] = useState('');
  const [confirmReviewedChecked, setConfirmReviewedChecked] = useState(false);
  const [confirmError, setConfirmError] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Modal scroll locking
  useEffect(() => {
    if (selectedReleaseRequest || confirmModalData || bankActionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedReleaseRequest, confirmModalData, bankActionModal]);

  // Modal Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmModalData && !isSubmittingDecision) {
          setConfirmModalData(null);
        } else if (selectedReleaseRequest && !isSubmittingDecision) {
          setSelectedReleaseRequest(null);
          if (lastActiveReviewReqId.current && reviewButtonRefs.current[lastActiveReviewReqId.current]) {
            reviewButtonRefs.current[lastActiveReviewReqId.current]?.focus();
          }
        } else if (bankActionModal && !isSubmittingBankAction) {
          setBankActionModal(null);
          setBankActionErrors({});
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModalData, selectedReleaseRequest, bankActionModal, isSubmittingDecision, isSubmittingBankAction]);

  // Document modal viewer
  const [viewerDoc, setViewerDoc] = useState<AppDocument | null>(null);
  const [fdrDocsMap, setFdrDocsMap] = useState<Record<string, AppDocument[]>>({});

  // Fetch documents for selected FDR when needed
  useEffect(() => {
    const targetFdrId = selectedBankFdrId || selectedReleaseRequest?.fdrId;
    if (targetFdrId && !fdrDocsMap[targetFdrId]) {
      api.getFdrDocuments(targetFdrId).then((docs: AppDocument[]) => {
        setFdrDocsMap(prev => ({ ...prev, [targetFdrId]: docs }));
      }).catch((err: any) => console.error('Failed to load docs for FDR', targetFdrId, err));
    }
  }, [selectedBankFdrId, selectedReleaseRequest?.fdrId]);

  // Urgent action queue data
  const discrepancyCases = useMemo(() => {
    return fdrList.filter(f => f.status === 'Discrepancy Flagged');
  }, [fdrList]);

  const urgentMaturityCases = useMemo(() => {
    return fdrList.filter(f => {
      const days = getDaysUntilMaturity(f.maturityDate);
      return days > 0 && days <= 90 && f.status !== 'Released' && f.status !== 'Matured';
    });
  }, [fdrList]);

  // Counts for KPIs
  const counts = useMemo(() => {
    return {
      active: fdrList.filter(f => f.status === 'Active/Verified').length,
      pendingScrutiny: fdrList.filter(f => f.status === 'Pending Scrutiny').length,
      pendingBank: bankConfirmations.filter(b => b.status === 'requested' || b.status === 'mismatch').length,
      discrepancy: fdrList.filter(f => f.status === 'Discrepancy Flagged').length,
      expiring: fdrList.filter(f => f.status === 'Expiring Soon').length,
      matured: fdrList.filter(f => f.status === 'Matured').length,
      renewed: fdrList.filter(f => f.status === 'Renewed').length,
      released: fdrList.filter(f => f.status === 'Released').length,
    };
  }, [fdrList, bankConfirmations]);

  const totalMonitoredDeposit = useMemo(() => {
    return fdrList
      .filter(f => f.status !== 'Released' && f.status !== 'Rejected')
      .reduce((sum, f) => sum + f.principalAmount, 0);
  }, [fdrList]);

  // Donut chart data with official tokens
  const donutData = useMemo(() => [
    { name: 'Active / Verified', value: counts.active, color: '#0E6A06' },
    { name: 'Pending Scrutiny', value: counts.pendingScrutiny, color: '#F5A623' },
    { name: 'Pending Bank API', value: counts.pendingBank, color: '#E69500' },
    { name: 'Discrepancies', value: counts.discrepancy, color: '#B3261E' },
    { name: 'Expiring (<90d)', value: counts.expiring, color: '#D96B00' },
    { name: 'Renewed', value: counts.renewed, color: '#1D6BB5' },
    { name: 'Released', value: counts.released, color: '#4A6280' },
  ], [counts]);

  // Bar chart data for maturity timeline
  const barData = [
    { period: 'Q4 2026', maturing: 4, renewed: 1 },
    { period: 'Q1 2027', maturing: 3, renewed: 2 },
    { period: 'Q2 2027', maturing: 2, renewed: 1 },
    { period: 'Q3 2027', maturing: 5, renewed: 0 },
    { period: '2028-2029', maturing: 12, renewed: 2 },
  ];

  // Filtered lists for scrutiny queue
  const scrutinyList = useMemo(() => {
    return fdrList.filter(f => f.status === 'Pending Scrutiny' || f.status === 'Discrepancy Flagged');
  }, [fdrList]);

  // Global search filtering
  const applySearch = (records: FDRRecord[]) => {
    return records.filter(r => {
      const matchText = 
        r.fdrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.institutionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.state.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchState = stateFilter === 'ALL' || r.state === stateFilter;
      const matchBank = bankFilter === 'ALL' || r.bankName === bankFilter;

      return matchText && matchState && matchBank;
    });
  };

  const filteredScrutiny = applySearch(scrutinyList);

  // Section 8: Bank Verification items
  const bankItemsWithFdr = useMemo(() => {
    return bankConfirmations.map(bc => {
      const fdr = fdrList.find(f => f.id === bc.fdrId);
      return {
        bc,
        fdr: fdr || null,
      };
    }).filter(item => item.fdr !== null);
  }, [bankConfirmations, fdrList]);

  const filteredBankItems = useMemo(() => {
    return bankItemsWithFdr.filter(({ bc, fdr }) => {
      if (!fdr) return false;
      const matchTab = bc.status === bankTab;
      const matchText = 
        fdr.fdrNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fdr.institutionName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fdr.bankName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchTab && matchText;
    });
  }, [bankItemsWithFdr, bankTab, searchQuery]);

  // Currently selected bank confirmation record for detail comparison
  const selectedBankItem = useMemo(() => {
    if (!selectedBankFdrId && filteredBankItems.length > 0) {
      return filteredBankItems[0];
    }
    return bankItemsWithFdr.find(item => item.bc.fdrId === selectedBankFdrId) || filteredBankItems[0] || null;
  }, [bankItemsWithFdr, selectedBankFdrId, filteredBankItems]);

  // Summary counts for Bank Verification tabs
  const bankTabCounts = useMemo(() => ({
    requested: bankConfirmations.filter(b => b.status === 'requested').length,
    matched: bankConfirmations.filter(b => b.status === 'matched').length,
    mismatch: bankConfirmations.filter(b => b.status === 'mismatch').length,
    not_requested: bankConfirmations.filter(b => b.status === 'not_requested').length,
  }), [bankConfirmations]);

  // Section 9: Handling Confirm Modal submit
  const handleOpenConfirmModal = (request: ReleaseRequest, action: 'approve' | 'hold' | 'reject') => {
    setConfirmModalData({ request, action });
    setConfirmRemarks('');
    setConfirmReviewedChecked(false);
    setConfirmError('');
  };

  const handleExecuteDecision = async () => {
    if (!confirmModalData) return;
    const { request, action } = confirmModalData;

    const minLen = action === 'approve' ? 10 : 15;
    if (confirmRemarks.trim().length < minLen) {
      setConfirmError(`Reason / remarks must be at least ${minLen} characters (currently ${confirmRemarks.trim().length}).`);
      return;
    }

    if (!confirmReviewedChecked) {
      setConfirmError('Please confirm that you have reviewed the details and documents.');
      return;
    }

    setConfirmError('');
    setIsSubmittingDecision(true);

    try {
      await reviewReleaseRequest(request.id, action, confirmRemarks.trim());
      toast.success(`Release request ${request.fdrNumber} successfully processed: ${action.toUpperCase()}`);
      setConfirmModalData(null);
      setSelectedReleaseRequest(null);
    } catch (err: any) {
      setConfirmError(err.message || 'Failed to submit decision');
      toast.error(err.message || 'Failed to submit decision');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Navigation helper for Section 7 (Back explicitly goes to '/')
  const handleBackToDashboard = () => {
    setActiveTab('overview');
    navigate('/');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-110px)] bg-[var(--page-bg)]">
      
      {/* 4. SIDEBAR: Section 6 & Task 2 requirement:
          - Fixed / Sticky at top-[112px] with h-[calc(100vh-112px)]
          - Nav list scrolls internally if viewport is small (overflow-y: auto)
          - No horizontal separator between Release Requests and Reports & Alerts.
          - Continuous list with equal spacing.
          - "Audit Trail" with small muted "Append-only" caption beneath/beside it, single left-aligned line.
      */}
      <aside className="w-full lg:w-[240px] bg-white border-r border-[#DCE6F2] flex flex-col shrink-0 select-none shadow-soft lg:sticky lg:top-[112px] lg:h-[calc(100vh-112px)] z-30">
        
        {/* Sidebar Nav (internal scroll on small viewports) */}
        <div className="p-4 space-y-1.5 overflow-y-auto flex-1">
          <div className="text-xs uppercase tracking-[0.8px] font-bold text-[#4A6280] px-3 py-2 shrink-0">
            REGULATORY BUREAUS
          </div>

          <button
            onClick={() => handleTabChange('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-inner text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-[#1D6BB5] text-white shadow-soft'
                : 'text-[#17324F] hover:bg-[#EAF1FA]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Executive Dashboard</span>
          </button>

          <button
            onClick={() => handleTabChange('scrutiny')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-inner text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'scrutiny'
                ? 'bg-[#1D6BB5] text-white shadow-soft'
                : 'text-[#17324F] hover:bg-[#EAF1FA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              <span>Scrutiny Queue</span>
            </div>
            {counts.pendingScrutiny + counts.discrepancy > 0 && (
              <span className="bg-[#B3261E] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {counts.pendingScrutiny + counts.discrepancy}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('bank-verify')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-inner text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'bank-verify'
                ? 'bg-[#1D6BB5] text-white shadow-soft'
                : 'text-[#17324F] hover:bg-[#EAF1FA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Building className="w-4 h-4 shrink-0" />
              <span>Bank Verification</span>
            </div>
            {counts.pendingBank > 0 && (
              <span className="bg-[#F5A623] text-[#143A6B] text-[11px] font-bold px-2 py-0.5 rounded-full">
                {counts.pendingBank}
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('release-requests')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-inner text-sm font-semibold transition-colors cursor-pointer ${
              activeTab === 'release-requests'
                ? 'bg-[#1D6BB5] text-white shadow-soft'
                : 'text-[#17324F] hover:bg-[#EAF1FA]'
            }`}
          >
            <div className="flex items-center gap-3">
              <ArrowUpRight className="w-4 h-4 shrink-0" />
              <span>Release Requests</span>
            </div>
            {releaseRequests.filter(r => r.status === 'Requested' || r.status === 'Under Review').length > 0 && (
              <span className="bg-[#1D6BB5] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                {releaseRequests.filter(r => r.status === 'Requested' || r.status === 'Under Review').length}
              </span>
            )}
          </button>

          {/* SECTION 6: Divider removed, continuous list with equal spacing */}

          <button
            onClick={() => navigate('/official/reports')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-inner text-sm font-semibold text-[#17324F] hover:bg-[#EAF1FA] transition-colors cursor-pointer"
          >
            <FileBarChart className="w-4 h-4 shrink-0 text-[#1D6BB5]" />
            <span>Reports & Alerts</span>
          </button>

          {/* SECTION 6: Audit Trail label on a single left-aligned line with muted "Append-only" caption */}
          <button
            onClick={() => navigate('/official/audit-log')}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-inner text-sm font-semibold text-[#17324F] hover:bg-[#EAF1FA] transition-colors cursor-pointer text-left"
          >
            <History className="w-4 h-4 shrink-0 text-[#1D6BB5]" />
            <div className="flex flex-col leading-tight">
              <span>Audit Trail</span>
              <span className="text-[10px] text-[#4A6280] font-normal">Append-only</span>
            </div>
          </button>
        </div>


        {/* Sidebar Footer block */}
        <div className="mt-auto p-4 m-3 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] text-xs text-[#4A6280] shrink-0">
          <div className="font-bold text-[#143A6B]">AICTE Regulation Bureau</div>
          <div className="mt-0.5">HQ: New Delhi, India</div>
          <div className="text-[11px] text-[#4A6280] mt-1 font-mono">Build: 2026.4.1 (Stable)</div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden min-w-0">
        
        {/* SECTION 7: Breadcrumbs and Back Navigation */}
        {activeTab !== 'overview' && (
          <div className="flex items-center justify-between gap-4 bg-white px-4 py-2.5 rounded-inner border border-[#DCE6F2] shadow-soft">
            <div className="flex items-center gap-2 text-xs">
              <Link
                to="/"
                onClick={(e) => {
                  e.preventDefault();
                  handleBackToDashboard();
                }}
                className="text-[#1D6BB5] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Home</span>
              </Link>
              <span className="text-[#4A6280]">/</span>
              <span className="font-bold text-[#143A6B]">
                {activeTab === 'scrutiny' && 'Scrutiny Queue'}
                {activeTab === 'bank-verify' && 'Bank Verification'}
                {activeTab === 'release-requests' && 'Release Requests'}
              </span>
            </div>

            <button
              onClick={handleBackToDashboard}
              className="text-xs text-[#4A6280] hover:text-[#143A6B] flex items-center gap-1 font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Executive Dashboard</span>
            </button>
          </div>
        )}

        {/* Global Search & Live Filter Bar */}
        <div className="bg-white p-4 rounded-card shadow-soft border border-[#DCE6F2] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#4A6280] absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by FDR No, College, IFSC or State..."
              className="w-full pl-9 pr-4 py-2 border border-[#DCE6F2] rounded-inner text-xs bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <select
              value={stateFilter}
              onChange={e => setStateFilter(e.target.value)}
              className="px-3 py-2 border border-[#DCE6F2] rounded-inner text-xs bg-white text-[#17324F] font-semibold cursor-pointer"
            >
              <option value="ALL">All States (National)</option>
              <option value="Maharashtra">Maharashtra</option>
              <option value="Karnataka">Karnataka</option>
              <option value="Tamil Nadu">Tamil Nadu</option>
              <option value="Delhi">Delhi</option>
              <option value="Telangana">Telangana</option>
              <option value="Uttar Pradesh">Uttar Pradesh</option>
            </select>

            <select
              value={bankFilter}
              onChange={e => setBankFilter(e.target.value)}
              className="px-3 py-2 border border-[#DCE6F2] rounded-inner text-xs bg-white text-[#17324F] font-semibold cursor-pointer"
            >
              <option value="ALL">All Partner Banks</option>
              <option value="State Bank of India">State Bank of India</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
              <option value="HDFC Bank">HDFC Bank</option>
              <option value="Canara Bank">Canara Bank</option>
              <option value="Bank of Baroda">Bank of Baroda</option>
              <option value="ICICI Bank">ICICI Bank</option>
            </select>
          </div>
        </div>

        {/* WORKSPACE TAB 0: EXECUTIVE DASHBOARD */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white p-5 rounded-card border border-[#DCE6F2] border-t-4 border-t-[#143A6B] shadow-soft">
                <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
                  Total Monitored Deposits
                </div>
                <div className="text-[26px] font-extrabold text-[#143A6B] mt-1 leading-tight">
                  {formatINR(totalMonitoredDeposit)}
                </div>
                <div className="text-xs text-[#0E6A06] font-semibold mt-1 flex items-center gap-1">
                  <span>●</span>
                  <span>{fdrList.length} Active Instruments under AICTE Lien</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange('scrutiny')}
                className="bg-white p-5 rounded-card border border-[#DCE6F2] border-t-4 border-t-[#B3261E] shadow-soft cursor-pointer hover:border-[#B3261E] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
                    Scrutiny Queue
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4A6280] group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[26px] font-extrabold text-[#B3261E] mt-1 leading-tight">
                  {counts.pendingScrutiny + counts.discrepancy}
                </div>
                <div className="text-xs text-[#B3261E] font-medium mt-1">
                  {counts.pendingScrutiny} new submissions · {counts.discrepancy} discrepancies
                </div>
              </div>

              <div 
                onClick={() => handleTabChange('bank-verify')}
                className="bg-white p-5 rounded-card border border-[#DCE6F2] border-t-4 border-t-[#F5A623] shadow-soft cursor-pointer hover:border-[#F5A623] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
                    Bank Core API Polling
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4A6280] group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[26px] font-extrabold text-[#7A4A00] mt-1 leading-tight">
                  {counts.pendingBank}
                </div>
                <div className="text-xs text-[#7A4A00] font-medium mt-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Awaiting Core Banking responses</span>
                </div>
              </div>

              <div 
                onClick={() => handleTabChange('release-requests')}
                className="bg-white p-5 rounded-card border border-[#DCE6F2] border-t-4 border-t-[#1D6BB5] shadow-soft cursor-pointer hover:border-[#1D6BB5] transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
                    Release Petitions
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#4A6280] group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="text-[26px] font-extrabold text-[#1D6BB5] mt-1 leading-tight">
                  {releaseRequests.filter(r => r.status === 'Requested' || r.status === 'Under Review').length}
                </div>
                <div className="text-xs text-[#1D6BB5] font-medium mt-1">
                  Pending Member Secretary clearance
                </div>
              </div>

            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Donut Chart */}
              <div className="bg-white p-6 rounded-card border border-[#DCE6F2] shadow-soft">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DCE6F2]">
                  <h3 className="text-sm font-bold text-[#143A6B]">Portfolio Health Breakdown</h3>
                  <span className="text-xs text-[#4A6280]">Live Database State</span>
                </div>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {donutData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-3 border-t border-[#DCE6F2] text-xs">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }}></span>
                      <span className="text-[#4A6280] truncate">{d.name}: <strong className="text-[#143A6B]">{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar Chart */}
              <div className="bg-white p-6 rounded-card border border-[#DCE6F2] shadow-soft">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#DCE6F2]">
                  <h3 className="text-sm font-bold text-[#143A6B]">Deposit Maturity Schedule by Quarter</h3>
                  <span className="text-xs text-[#4A6280]">2026 - 2029 Horizon</span>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E3EEFB" />
                      <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#4A6280' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#4A6280' }} />
                      <RechartsTooltip />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                      <Bar dataKey="maturing" fill="#F5A623" name="Maturing FDRs" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="renewed" fill="#1D6BB5" name="Renewals Anticipated" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-xs text-[#4A6280] text-center mt-2 pt-2 border-t border-[#DCE6F2]">
                  Automated alerts trigger at 90, 60, 30, and 15 days before maturity.
                </div>
              </div>

            </div>

            {/* Quick Access to Scrutiny Queue Table */}
            <div className="bg-white rounded-card border border-[#DCE6F2] shadow-soft overflow-hidden">
              <div className="px-6 py-4 border-b border-[#DCE6F2] flex items-center justify-between bg-[#F3F7FC]">
                <h3 className="text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B]">
                  Recent FDRs Pending Scrutiny & Cross-Verification
                </h3>
                <button
                  onClick={() => handleTabChange('scrutiny')}
                  className="text-xs text-[#1D6BB5] hover:underline font-semibold cursor-pointer"
                >
                  View full queue →
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
                  <thead className="bg-[#F3F7FC]">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">FDR Account No.</th>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Institution</th>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Bank</th>
                      <th className="px-4 py-3 text-right font-bold text-[#143A6B] uppercase tracking-[0.8px]">Deposit Amount</th>
                      <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE6F2] bg-white">
                    {filteredScrutiny.slice(0, 4).map(fdr => (
                      <tr key={fdr.id} className="hover:bg-[#F3F8FD] transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">
                          <div className="flex items-center gap-1.5">
                            <span>{maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}</span>
                            {fdr.version > 1 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold uppercase bg-[#E3EEFB] text-[#1D6BB5] border border-[#1D6BB5]/40">
                                Resubmitted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#143A6B]">{fdr.institutionName}</div>
                          <div className="text-[11px] text-[#4A6280] font-mono">{fdr.institutionId} · {fdr.state}</div>
                        </td>
                        <td className="px-4 py-3 text-[#17324F]">{fdr.bankName}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#143A6B]">{formatINR(fdr.principalAmount)}</td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={fdr.status} /></td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/official/fdr/${fdr.id}`}
                            className="px-3 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-inner text-xs cursor-pointer inline-block shadow-soft"
                          >
                            Scrutinize
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* WORKSPACE TAB 1: SCRUTINY QUEUE */}
        {activeTab === 'scrutiny' && (
          <div className="bg-white rounded-card border border-[#DCE6F2] shadow-soft overflow-hidden animate-fadeIn">
            <div className="px-6 py-4 border-b border-[#DCE6F2] bg-[#F3F7FC] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#143A6B]">Official Scrutiny Queue</h3>
                <p className="text-xs text-[#4A6280] mt-0.5">
                  Click any row to open the split-screen Dual-Data Comparison Grid and Action Center.
                </p>
              </div>
              <span className="text-xs bg-[#E3EEFB] text-[#1D6BB5] px-3 py-1 rounded-full font-bold">
                {filteredScrutiny.length} Records In Queue
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
                <thead className="bg-[#F3F7FC]">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">FDR Account No.</th>
                    <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">College / Institution</th>
                    <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Bank & IFSC</th>
                    <th className="px-4 py-3 text-right font-bold text-[#143A6B] uppercase tracking-[0.8px]">Principal</th>
                    <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Submitted Date</th>
                    <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Status</th>
                    <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE6F2] bg-white">
                  {filteredScrutiny.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#4A6280]">
                        No pending cases in the scrutiny queue.
                      </td>
                    </tr>
                  ) : (
                    filteredScrutiny.map(fdr => (
                      <tr key={fdr.id} className="hover:bg-[#F3F8FD] transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">
                          <div className="flex items-center gap-1.5">
                            <span>{maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}</span>
                            {fdr.version > 1 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-[#E3EEFB] text-[#1D6BB5] border border-[#1D6BB5]/40">
                                Resubmitted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#143A6B]">{fdr.institutionName}</div>
                          <div className="text-[11px] text-[#4A6280] font-mono">{fdr.institutionId} · {fdr.state}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#17324F]">{fdr.bankName}</div>
                          <div className="text-[11px] text-[#4A6280] font-mono">{fdr.branchIfsc}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-[#143A6B]">
                          {formatINR(fdr.principalAmount)}
                        </td>
                        <td className="px-4 py-3 text-[#17324F]">{formatDate(fdr.createdAt)}</td>
                        <td className="px-4 py-3 text-center">
                          <StatusBadge status={fdr.status} />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Link
                            to={`/official/fdr/${fdr.id}`}
                            className="px-3 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-inner text-xs transition-colors cursor-pointer inline-flex items-center gap-1 shadow-soft"
                          >
                            <span>Open Case</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WORKSPACE TAB 2: BANK VERIFICATION (SECTION 8: REBUILT SCREEN) */}
        {activeTab === 'bank-verify' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header & Persistent Simulation Banner */}
            <div className="bg-white rounded-card border border-[#DCE6F2] p-5 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-base font-bold text-[#143A6B]">Bank Core Interface Cross-Verification</h3>
                  {/* Persistent SIMULATED badge */}
                  <span className="px-2.5 py-1 bg-[#FFF1D6] text-[#7A4A00] border border-[#B26A00] rounded-full text-[11px] font-extrabold uppercase tracking-wide">
                    SIMULATED RESPONSE — not an actual bank confirmation
                  </span>
                </div>
                <p className="text-xs text-[#4A6280] mt-1">
                  Automated claim-versus-bank authoritative record reconciliation. Verify joint lien and maturity terms.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#4A6280]">Status filter tabs below control the queue view.</span>
              </div>
            </div>

            {/* Status Tabs for Bank Queue */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#DCE6F2] pb-2">
              <button
                onClick={() => setBankTab('requested')}
                className={`px-4 py-2 rounded-inner text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  bankTab === 'requested'
                    ? 'bg-[#1D6BB5] text-white shadow-soft'
                    : 'bg-white text-[#17324F] hover:bg-[#EAF1FA] border border-[#DCE6F2]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Awaiting Bank Response</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bankTab === 'requested' ? 'bg-white text-[#1D6BB5]' : 'bg-[#E3EEFB] text-[#1D6BB5]'}`}>
                  {bankTabCounts.requested}
                </span>
              </button>

              <button
                onClick={() => setBankTab('matched')}
                className={`px-4 py-2 rounded-inner text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  bankTab === 'matched'
                    ? 'bg-[#0E6A06] text-white shadow-soft'
                    : 'bg-white text-[#17324F] hover:bg-[#EAF1FA] border border-[#DCE6F2]'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Received — Matched (100%)</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bankTab === 'matched' ? 'bg-white text-[#0E6A06]' : 'bg-[#EAF1FA] text-[#0E6A06]'}`}>
                  {bankTabCounts.matched}
                </span>
              </button>

              <button
                onClick={() => setBankTab('mismatch')}
                className={`px-4 py-2 rounded-inner text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  bankTab === 'mismatch'
                    ? 'bg-[#B3261E] text-white shadow-soft'
                    : 'bg-white text-[#17324F] hover:bg-[#EAF1FA] border border-[#DCE6F2]'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Received — Mismatch Detected</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bankTab === 'mismatch' ? 'bg-white text-[#B3261E]' : 'bg-[#FDECEA] text-[#B3261E]'}`}>
                  {bankTabCounts.mismatch}
                </span>
              </button>

              <button
                onClick={() => setBankTab('not_requested')}
                className={`px-4 py-2 rounded-inner text-xs font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                  bankTab === 'not_requested'
                    ? 'bg-[#4A6280] text-white shadow-soft'
                    : 'bg-white text-[#17324F] hover:bg-[#EAF1FA] border border-[#DCE6F2]'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Not Requested</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${bankTab === 'not_requested' ? 'bg-white text-[#4A6280]' : 'bg-[#EAF1FA] text-[#4A6280]'}`}>
                  {bankTabCounts.not_requested}
                </span>
              </button>
            </div>

            {/* Split layout: Queue table on top/left, Detail 3-column comparison below/right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Bank Verification Queue List */}
              <div className="lg:col-span-5 bg-white rounded-card border border-[#DCE6F2] shadow-soft overflow-hidden">
                <div className="px-4 py-3 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B]">
                    Verification Tasks ({filteredBankItems.length})
                  </span>
                  <span className="text-[11px] text-[#4A6280]">Select row to inspect claim</span>
                </div>

                <div className="divide-y divide-[#DCE6F2] max-h-[580px] overflow-y-auto">
                  {filteredBankItems.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#4A6280]">
                      No instruments in this verification tab.
                    </div>
                  ) : (
                    filteredBankItems.map(({ bc, fdr }) => {
                      if (!fdr) return null;
                      const isSelected = selectedBankItem?.bc.fdrId === fdr.id;
                      return (
                        <div
                          key={bc.id}
                          onClick={() => setSelectedBankFdrId(fdr.id)}
                          className={`p-3.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#E3EEFB] border-l-4 border-l-[#1D6BB5]'
                              : 'hover:bg-[#F3F8FD]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono font-bold text-xs text-[#143A6B]">
                              {maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              bc.status === 'matched' ? 'bg-[#EAF1FA] text-[#0E6A06] border border-[#138808]/40' :
                              bc.status === 'mismatch' ? 'bg-[#FDECEA] text-[#B3261E] border border-[#B3261E]/40' :
                              bc.status === 'requested' ? 'bg-[#FFF1D6] text-[#7A4A00] border border-[#B26A00]/40' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {bc.status === 'matched' && '✓ Matched'}
                              {bc.status === 'mismatch' && '⚠ Mismatch'}
                              {bc.status === 'requested' && '⧗ Awaiting'}
                              {bc.status === 'not_requested' && '○ Not Sent'}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-[#143A6B] mt-1 truncate">
                            {fdr.institutionName}
                          </div>
                          <div className="text-[11px] text-[#4A6280] flex items-center justify-between mt-1">
                            <span>{fdr.bankName}</span>
                            <strong className="text-[#143A6B]">{formatINR(fdr.principalAmount)}</strong>
                          </div>

                          <div className="mt-2 pt-2 border-t border-[#DCE6F2]/50 text-[10px] text-[#4A6280] flex items-center justify-between leading-none">
                            <span>Req: {bc.requestedAt ? formatDate(bc.requestedAt) : 'Pending'}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Detail View: Three-Column Comparison Grid & Official Actions */}
              <div className="lg:col-span-7 space-y-4">
                {selectedBankItem && selectedBankItem.fdr ? (() => {
                  const fdr = selectedBankItem.fdr!;
                  const bc = selectedBankItem.bc;
                  const bf = bc.bankFields;

                  // Define 9 field comparisons
                  const fieldComparisons = [
                    {
                      label: 'Account Holder Name',
                      college: fdr.institutionName,
                      bank: bf?.accountHolder || 'Not returned',
                      match: bf?.accountHolder ? fdr.institutionName.trim().toUpperCase() === bf.accountHolder.trim().toUpperCase() : null,
                    },
                    {
                      label: 'FDR Number',
                      college: fdr.fdrNumber,
                      bank: bf?.fdrNumber || 'Not returned',
                      match: bf?.fdrNumber ? fdr.fdrNumber.trim() === bf.fdrNumber.trim() : null,
                    },
                    {
                      label: 'Principal Amount',
                      college: formatINR(fdr.principalAmount),
                      bank: bf?.principalAmount ? formatINR(bf.principalAmount) : 'Not returned',
                      match: bf?.principalAmount ? fdr.principalAmount === bf.principalAmount : null,
                    },
                    {
                      label: 'Issue Date',
                      college: formatDate(fdr.issueDate),
                      bank: bf?.issueDate ? formatDate(bf.issueDate) : 'Not returned',
                      match: bf?.issueDate ? fdr.issueDate === bf.issueDate : null,
                    },
                    {
                      label: 'Maturity Date / Tenure',
                      college: formatDate(fdr.maturityDate),
                      bank: bf?.maturityDate ? formatDate(bf.maturityDate) : 'Not returned',
                      match: bf?.maturityDate ? fdr.maturityDate === bf.maturityDate : null,
                    },
                    {
                      label: 'Bank & Branch',
                      college: `${fdr.bankName}, ${fdr.branchIfsc}`,
                      bank: bf ? `${(bf as any).bankName || fdr.bankName}, ${bf.branchName}` : 'Not returned',
                      match: bf ? (bf.branchName && fdr.branchIfsc.includes(bf.ifsc.substring(0, 4))) : null,
                    },
                    {
                      label: 'IFSC Code',
                      college: fdr.branchIfsc,
                      bank: bf?.ifsc || 'Not returned',
                      match: bf?.ifsc ? fdr.branchIfsc.trim().toUpperCase() === bf.ifsc.trim().toUpperCase() : null,
                    },
                    {
                      label: 'Joint Lien in favour of AICTE',
                      college: 'Yes (Lien Registered)',
                      bank: bf ? (bf.lienMarkedInFavourOf ? 'Yes (Joint Lien Confirmed)' : 'NO - Lien Not Marked') : 'Not returned',
                      match: bf ? bf.lienMarkedInFavourOf === true : null,
                    },
                    {
                      label: 'Interest Rate',
                      college: '7.25% p.a.',
                      bank: bf?.interestRate ? `${bf.interestRate}% p.a.` : 'Not returned',
                      match: bf?.interestRate ? bf.interestRate >= 7.0 : null,
                    },
                  ];

                  const totalChecked = fieldComparisons.filter(f => f.match !== null).length;
                  const matchedCount = fieldComparisons.filter(f => f.match === true).length;
                  const mismatchCount = fieldComparisons.filter(f => f.match === false).length;
                  const allMatch = totalChecked > 0 && mismatchCount === 0;

                  return (
                    <div className="bg-white rounded-card border border-[#DCE6F2] shadow-soft overflow-hidden space-y-4 p-5">
                      {/* Top Header of Detail */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCE6F2] pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-base font-extrabold text-[#143A6B]">
                              {maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}
                            </span>
                            <StatusBadge status={fdr.status} size="sm" />
                          </div>
                          <div className="text-xs text-[#4A6280] mt-0.5">
                            {fdr.institutionName} ({fdr.institutionId}) · Bank: {fdr.bankName}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/official/fdr/${fdr.id}`}
                            className="text-xs px-3 py-1.5 bg-[#E3EEFB] hover:bg-[#1D6BB5] hover:text-white text-[#1D6BB5] rounded-inner font-semibold transition-colors flex items-center gap-1"
                          >
                            <span>Open Scrutiny Case</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Summary Match Banner */}
                      <div className={`p-3.5 rounded-inner text-xs flex items-center justify-between ${
                        allMatch
                          ? 'bg-[#EAF1FA] text-[#0E6A06] border border-[#138808]/30 font-semibold'
                          : mismatchCount > 0
                          ? 'bg-[#FDECEA] text-[#B3261E] border border-[#B3261E]/30 font-semibold'
                          : 'bg-[#FFF1D6] text-[#7A4A00] border border-[#B26A00]/30 font-semibold'
                      }`}>
                        <div className="flex items-center gap-2">
                          {allMatch ? (
                            <CheckCircle2 className="w-4 h-4 text-[#0E6A06]" />
                          ) : mismatchCount > 0 ? (
                            <AlertTriangle className="w-4 h-4 text-[#B3261E]" />
                          ) : (
                            <Clock className="w-4 h-4 text-[#7A4A00]" />
                          )}
                          <span>
                            Reconciliation Result:{' '}
                            <strong>
                              {totalChecked > 0 ? `${matchedCount} of ${totalChecked} fields match, ${mismatchCount} mismatches` : 'Awaiting automated response'}
                            </strong>
                          </span>
                        </div>
                        <span className="font-mono text-[11px] uppercase tracking-wider">
                          {bc.status}
                        </span>
                      </div>

                      {/* Three-Column Comparison Table */}
                      <div className="border border-[#DCE6F2] rounded-inner overflow-hidden text-xs">
                        <div className="grid grid-cols-12 bg-[#F3F7FC] p-2.5 font-bold uppercase tracking-[0.8px] text-[#143A6B] border-b border-[#DCE6F2]">
                          <div className="col-span-3">Field</div>
                          <div className="col-span-4 border-l border-[#DCE6F2] pl-2">College Claim</div>
                          <div className="col-span-4 border-l border-[#DCE6F2] pl-2">Bank Record (Simulated)</div>
                          <div className="col-span-1 border-l border-[#DCE6F2] text-center">Result</div>
                        </div>

                        <div className="divide-y divide-[#DCE6F2]">
                          {fieldComparisons.map((row, idx) => (
                            <div 
                              key={idx} 
                              className={`grid grid-cols-12 p-2.5 items-center ${
                                row.match === false ? 'bg-[#FDECEA]/40' : row.match === true ? 'hover:bg-[#F8FAFD]' : ''
                              }`}
                            >
                              <div className="col-span-3 font-semibold text-[#143A6B]">{row.label}</div>
                              <div className="col-span-4 border-l border-[#DCE6F2] pl-2 text-[#17324F] truncate font-mono">
                                {row.college}
                              </div>
                              <div className={`col-span-4 border-l border-[#DCE6F2] pl-2 truncate font-mono ${
                                row.match === false ? 'text-[#B3261E] font-bold bg-[#FDECEA] px-1 rounded' : 'text-[#17324F]'
                              }`}>
                                {row.bank}
                              </div>
                              <div className="col-span-1 border-l border-[#DCE6F2] text-center flex items-center justify-center">
                                {row.match === true && (
                                  <span className="text-[#0E6A06] font-bold" title="Match">✓</span>
                                )}
                                {row.match === false && (
                                  <span className="text-[#B3261E] font-extrabold text-sm" title="Mismatch (Not Equal)">≠</span>
                                )}
                                {row.match === null && (
                                  <span className="text-[#4A6280]" title="Not available">—</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Official Actions Toolbar */}
                      <div className="p-4 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B]">
                            Official Verification Actions
                          </span>
                          <span className="text-[11px] text-[#4A6280]">Realtime ledger updates</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          
                          {/* 1. Request Bank Confirmation */}
                          {(bc.status === 'not_requested' || bc.status === 'mismatch') && (
                            <button
                              onClick={async () => {
                                await requestBankConfirmation(fdr.id);
                                toast.success('API request sent to partner bank gateway');
                              }}
                              className="px-3 py-2 bg-[#1D6BB5] hover:bg-[#143A6B] text-white text-xs font-semibold rounded-inner flex items-center gap-1.5 cursor-pointer shadow-soft transition-colors"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Request Bank Confirmation</span>
                            </button>
                          )}

                          {/* 2. Simulate Bank Response (Demo helper) */}
                          {bc.status === 'requested' && (
                            <button
                              onClick={async () => {
                                await simulateBankResponse(fdr.id);
                                toast.success('Simulated bank core response received and cross-referenced!');
                              }}
                              className="px-3 py-2 bg-[#F5A623] hover:bg-[#B26A00] text-[#143A6B] text-xs font-bold rounded-inner flex items-center gap-1.5 cursor-pointer shadow-soft transition-colors animate-pulse"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Simulate Bank Response</span>
                            </button>
                          )}

                          {/* 3. Mark Verified: ONLY if all fields match, else disabled with tooltip */}
                          <button
                            disabled={!allMatch || bc.status !== 'matched'}
                            onClick={async () => {
                              await markBankVerified(fdr.id);
                              toast.success(`FDR ${fdr.fdrNumber} marked as Verified. Joint lien active.`);
                            }}
                            title={
                              !allMatch || bc.status !== 'matched'
                                ? 'Disabled: All fields must match bank confirmation before marking verified.'
                                : 'Mark FDR as verified'
                            }
                            className={`px-3 py-2 text-xs font-semibold rounded-inner flex items-center gap-1.5 transition-colors shadow-soft ${
                              allMatch && bc.status === 'matched'
                                ? 'bg-[#0E6A06] hover:bg-green-800 text-white cursor-pointer'
                                : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Verified</span>
                          </button>

                          {/* 4. Raise Discrepancy */}
                          <button
                            onClick={() => {
                              setBankActionModal({
                                type: 'discrepancy',
                                fdrId: fdr.id,
                                fdrNumber: fdr.fdrNumber,
                                bcId: bc.id,
                                institutionName: fdr.institutionName,
                              });
                              const defaultReason = mismatchCount > 0
                                ? 'Amount mismatch between bank confirmation and submitted instrument'
                                : 'Joint Lien not marked in favour of AICTE in bank records';
                              setBankActionReason(defaultReason);
                              setBankActionRemarks(`Mismatches identified in bank core verification: ${fieldComparisons.filter(f => f.match === false).map(f => f.label).join(', ')}.`);
                              setBankActionErrors({});
                            }}
                            className="px-3 py-2 bg-[#B3261E] hover:bg-[#9F1D14] text-white text-xs font-semibold rounded-inner flex items-center gap-1.5 cursor-pointer shadow-soft transition-colors"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Raise Discrepancy</span>
                          </button>

                          {/* 5. Request Corrected Document */}
                          <button
                            onClick={() => {
                              setBankActionModal({
                                type: 'corrected_doc',
                                fdrId: fdr.id,
                                fdrNumber: fdr.fdrNumber,
                                bcId: bc.id,
                                institutionName: fdr.institutionName,
                              });
                              setBankActionReason('Request for corrected FDR instrument / revised certificate');
                              setBankActionRemarks('Official request for corrected bank FDR certificate / revised lien endorsement letter.');
                              setBankActionErrors({});
                            }}
                            className="px-3 py-2 bg-white border border-[#DCE6F2] hover:bg-[#EAF1FA] text-[#143A6B] text-xs font-semibold rounded-inner flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#1D6BB5]" />
                            <span>Request Corrected Document</span>
                          </button>

                        </div>
                      </div>

                      {/* Documents for this FDR (Section 3: Documents Panel) */}
                      <DocumentsPanel
                        documents={fdrDocsMap[fdr.id] || []}
                        fdrId={fdr.id}
                        fdrNumber={fdr.fdrNumber}
                        currentRole="official"
                      />

                    </div>
                  );
                })() : (
                  <div className="bg-white rounded-card border border-[#DCE6F2] p-12 text-center text-xs text-[#4A6280] shadow-soft">
                    Select an instrument from the verification queue to inspect field-level bank comparisons.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* WORKSPACE TAB 3: RELEASE REQUESTS (SECTION 9: REVIEW & CONFIRMATION) */}
        {activeTab === 'release-requests' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header info */}
            <div className="bg-white rounded-card border border-[#DCE6F2] p-5 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-[#143A6B]">Security Deposit Release & Refund Workflow</h3>
                <p className="text-xs text-[#4A6280] mt-0.5">
                  Review college release petitions and authorize deposit discharge under AICTE Approval Process Handbook guidelines.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs bg-[#E3EEFB] text-[#1D6BB5] px-3 py-1 rounded-full font-bold">
                  {releaseRequests.length} Total Claims
                </span>
              </div>
            </div>

            {/* Release Requests Table */}
            <div className="bg-white rounded-card border border-[#DCE6F2] shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
                  <thead className="bg-[#F3F7FC]">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Request ID</th>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Institution</th>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">FDR & Bank</th>
                      <th className="px-4 py-3 text-right font-bold text-[#143A6B] uppercase tracking-[0.8px]">Deposit Sum</th>
                      <th className="px-4 py-3 text-left font-bold text-[#143A6B] uppercase tracking-[0.8px]">Reason / Grounds</th>
                      <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Requested Date</th>
                      <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Status</th>
                      <th className="px-4 py-3 text-center font-bold text-[#143A6B] uppercase tracking-[0.8px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DCE6F2] bg-white">
                    {releaseRequests.map(req => {
                      const fdr = fdrList.find(f => f.id === req.fdrId);
                      return (
                        <tr key={req.id} className="hover:bg-[#F3F8FD] transition-colors">
                          <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">{req.id}</td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[#143A6B]">{req.institutionName}</div>
                            <div className="text-[11px] text-[#4A6280] font-mono">{req.institutionId}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-mono text-[#143A6B]">{maskFdrNumber(req.fdrNumber, !maskFdrNumberState)}</div>
                            <div className="text-[11px] text-[#4A6280]">{req.bankName}</div>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-[#0E6A06]">{formatINR(req.principalAmount)}</td>
                          <td className="px-4 py-3 max-w-xs text-[#17324F] truncate">{req.reason}</td>
                          <td className="px-4 py-3 text-center text-[#4A6280]">{formatDate(req.requestDate)}</td>
                          <td className="px-4 py-3 text-center">
                            <StatusBadge status={req.status as any} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              ref={el => { reviewButtonRefs.current[req.id] = el; }}
                              onClick={() => {
                                lastActiveReviewReqId.current = req.id;
                                setSelectedReleaseRequest(req);
                              }}
                              className="px-3 py-1.5 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-inner text-xs transition-colors cursor-pointer shadow-soft inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Review</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* SECTION 9: RELEASE REQUEST REVIEW MODAL (CENTERED POPUP) */}
      {selectedReleaseRequest && (() => {
        const req = selectedReleaseRequest;
        const fdr = fdrList.find(f => f.id === req.fdrId);
        const docs = fdrDocsMap[req.fdrId] || [];
        const resolutionDoc = docs.find(d => d.category === 'release_resolution' || d.releaseRequestId === req.id) || docs[0];

        // Outstanding risk flags / blockers from risk rules
        const blockers: string[] = [];
        if (fdr?.status === 'Discrepancy Flagged') {
          blockers.push(`Unresolved discrepancy on FDR: "${fdr.discrepancyRemarks || 'Data mismatch'}"`);
        }
        if (fdr?.status === 'Pending Bank Verification') {
          blockers.push('Bank verification is not completed yet.');
        }
        const hasResolutionDoc = !!resolutionDoc || !!req.supportingDocName;
        if (!hasResolutionDoc) {
          blockers.push('Missing supporting resolution / no-dues certificate PDF.');
        }
        const hasBlockers = blockers.length > 0;

        const handleCloseReview = () => {
          setSelectedReleaseRequest(null);
          if (lastActiveReviewReqId.current && reviewButtonRefs.current[lastActiveReviewReqId.current]) {
            reviewButtonRefs.current[lastActiveReviewReqId.current]?.focus();
          }
        };

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
            onClick={(e) => {
              if (e.target === e.currentTarget && !confirmModalData) {
                handleCloseReview();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="release-review-modal-title"
              className="bg-white rounded-card shadow-float max-w-4xl w-full max-h-[90vh] flex flex-col border border-[#DCE6F2] overflow-hidden my-auto animate-fadeIn"
            >
              {/* Sticky Header */}
              <div className="px-6 py-4 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.8px] text-[#4A6280]">Reviewing Release Petition</span>
                    <StatusBadge status={req.status as any} size="sm" />
                  </div>
                  <h3 id="release-review-modal-title" className="text-lg font-bold text-[#143A6B] mt-0.5">
                    {req.institutionName} — FDR {maskFdrNumber(req.fdrNumber, !maskFdrNumberState)}
                  </h3>
                </div>

                <button
                  onClick={handleCloseReview}
                  aria-label="Close review dialog"
                  className="text-[#4A6280] hover:text-[#143A6B] p-1.5 rounded-inner text-lg font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 2-Column Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left: FDR & Petition Details */}
                  <div className="space-y-4">
                    <div className="p-4 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] space-y-2 text-xs">
                      <div className="font-bold text-[#143A6B] uppercase tracking-[0.8px]">Petition Details</div>
                      <div className="grid grid-cols-2 gap-2 text-[#17324F]">
                        <div>Institution ID: <strong>{req.institutionId}</strong></div>
                        <div>Bank: <strong>{req.bankName}</strong></div>
                        <div>Deposit Value: <strong className="text-[#0E6A06]">{formatINR(req.principalAmount)}</strong></div>
                        <div>Request Date: <strong>{formatDate(req.requestDate)}</strong></div>
                        <div className="col-span-2">
                          Grounds / Justification:
                          <div className="mt-1 p-2 bg-white rounded border border-[#DCE6F2] text-[#143A6B] italic font-serif">
                            "{req.reason}"
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Outstanding Blockers */}
                    <div className={`p-4 rounded-inner border text-xs ${
                      hasBlockers 
                        ? 'bg-[#FDECEA] border-[#F0C4BF] text-[#B3261E]'
                        : 'bg-[#EAF1FA] border-[#138808]/30 text-[#0E6A06]'
                    }`}>
                      <div className="font-bold uppercase tracking-[0.8px] flex items-center gap-1.5 mb-1.5">
                        {hasBlockers ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        <span>{hasBlockers ? 'Outstanding Compliance Blockers' : 'Regulatory Prerequisites Cleared'}</span>
                      </div>
                      {hasBlockers ? (
                        <ul className="list-disc list-inside space-y-1">
                          {blockers.map((b, i) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No open discrepancies or lien covenants preventing release authorization.</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Attached Supporting Resolution Document & Documents Panel */}
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-inner border border-[#DCE6F2] shadow-soft space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-[#1D6BB5]" />
                          <span>Supporting Resolution / No-Dues Order</span>
                        </span>
                        {resolutionDoc && (
                          <span className="text-[10px] bg-[#E3EEFB] text-[#1D6BB5] px-2 py-0.5 rounded font-mono font-bold">
                            v{resolutionDoc.version}
                          </span>
                        )}
                      </div>

                      {resolutionDoc ? (
                        <div className="border border-[#DCE6F2] rounded p-3 bg-[#F8FAFD] flex items-center justify-between">
                          <div className="truncate">
                            <div className="text-xs font-bold text-[#143A6B] truncate">{resolutionDoc.originalName}</div>
                            <div className="text-[11px] text-[#4A6280]">{formatDate(resolutionDoc.uploadedAt)} · {(resolutionDoc.sizeBytes / (1024*1024)).toFixed(2)} MB</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewerDoc(resolutionDoc)}
                              className="px-2.5 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white text-xs font-semibold rounded cursor-pointer transition-colors"
                            >
                              View PDF
                            </button>
                            <a
                              href={`/api/documents/${resolutionDoc.id}/file`}
                              download={resolutionDoc.originalName}
                              className="px-2.5 py-1 bg-white border border-[#DCE6F2] hover:bg-gray-100 text-[#143A6B] text-xs font-semibold rounded cursor-pointer"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ) : req.supportingDocName ? (
                        <div className="border border-[#DCE6F2] rounded p-3 bg-[#F8FAFD] flex items-center justify-between">
                          <div className="text-xs font-bold text-[#143A6B]">{req.supportingDocName}</div>
                          <span className="text-[11px] text-[#0E6A06] font-semibold">Attached</span>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-[#B3261E]">
                          No supporting resolution document uploaded.
                        </div>
                      )}

                      <div className="text-[11px] text-[#4A6280] leading-tight">
                        Requirement: Resolution passed by the Governing Body / Trust and No-Dues clearance from AICTE Regional Office.
                      </div>
                    </div>

                    {/* Documents panel for all other files */}
                    <DocumentsPanel
                      documents={docs}
                      fdrId={req.fdrId}
                      fdrNumber={req.fdrNumber}
                      currentRole="official"
                    />
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 bg-[#F3F7FC] border-t border-[#DCE6F2] flex flex-wrap items-center justify-end gap-3 shrink-0">
                {/* Place On Hold */}
                <button
                  type="button"
                  onClick={() => handleOpenConfirmModal(req, 'hold')}
                  className="px-4 py-2.5 bg-[#F5A623] hover:bg-[#B26A00] text-white text-xs font-semibold rounded-inner cursor-pointer shadow-soft transition-colors flex items-center gap-1.5"
                >
                  <Clock className="w-4 h-4" />
                  <span>Place On Hold</span>
                </button>

                {/* Reject */}
                <button
                  type="button"
                  onClick={() => handleOpenConfirmModal(req, 'reject')}
                  title="Reject release petition"
                  className="px-4 py-2.5 bg-[#B3261E] hover:bg-[#9F1D14] text-white text-xs font-semibold rounded-inner shadow-soft transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Reject Petition</span>
                </button>

                {/* Approve Release */}
                <button
                  type="button"
                  disabled={hasBlockers}
                  onClick={() => handleOpenConfirmModal(req, 'approve')}
                  title={
                    hasBlockers
                      ? 'Disabled: Outstanding compliance blockers or missing documents must be resolved first.'
                      : 'Authorize release of security deposit'
                  }
                  className={`px-5 py-2.5 text-xs font-bold rounded-inner shadow-soft transition-colors flex items-center gap-1.5 ${
                    !hasBlockers
                      ? 'bg-[#0E6A06] hover:bg-green-800 text-white cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Approve Release</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SECTION 9 CONFIRMATION MODAL */}
      {confirmModalData && (() => {
        const { request, action } = confirmModalData;
        const minLen = action === 'approve' ? 10 : 15;
        const charCount = confirmRemarks.trim().length;
        const hasEnoughChars = charCount >= minLen;

        const actionTitle = 
          action === 'approve' ? 'APPROVE' :
          action === 'hold' ? 'PLACE ON HOLD' : 'REJECT';

        const actionColor = 
          action === 'approve' ? 'text-[#0E6A06]' :
          action === 'hold' ? 'text-[#7A4A00]' : 'text-[#B3261E]';

        const actionBtnColor = 
          action === 'approve' ? 'bg-[#0E6A06] hover:bg-green-800 text-white' :
          action === 'hold' ? 'bg-[#F5A623] hover:bg-[#B26A00] text-white' :
          'bg-[#B3261E] hover:bg-[#9F1D14] text-white';

        return (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <div className="bg-white rounded-card shadow-float max-w-xl w-full border border-[#DCE6F2] overflow-hidden my-8">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.8px] text-[#4A6280]">
                    Official Decision Confirmation
                  </div>
                  <h3 className={`text-base font-extrabold ${actionColor} mt-0.5`}>
                    You are about to {actionTitle} release of FDR {maskFdrNumber(request.fdrNumber, !maskFdrNumberState)} worth {formatINR(request.principalAmount)}
                  </h3>
                </div>
                <button
                  onClick={() => setConfirmModalData(null)}
                  className="text-[#4A6280] hover:text-[#143A6B] text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4 text-xs">
                
                {/* Read-only summary */}
                <div className="p-4 bg-[#F8FAFD] rounded-inner border border-[#DCE6F2] space-y-1.5 text-[#17324F]">
                  <div className="flex justify-between">
                    <span className="text-[#4A6280]">Institution:</span>
                    <strong className="text-[#143A6B]">{request.institutionName} ({request.institutionId})</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A6280]">FDR & Bank:</span>
                    <span className="font-mono font-bold text-[#143A6B]">{request.fdrNumber} · {request.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A6280]">Principal Amount:</span>
                    <strong className="text-[#0E6A06] font-mono">{formatINR(request.principalAmount)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A6280]">Reason Given:</span>
                    <span className="italic max-w-[280px] text-right truncate">"{request.reason}"</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#4A6280]">Supporting Document:</span>
                    <span className="text-[#1D6BB5] font-semibold">{request.supportingDocName || 'Attached PDF verified'}</span>
                  </div>
                </div>

                {/* Specific Note for Approve */}
                {action === 'approve' && (
                  <div className="p-3 bg-[#EAF1FA] border border-[#138808]/30 rounded-inner text-[#0E6A06] text-[11px] font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Final release requires competent authority approval from the Member Secretary, AICTE.</span>
                  </div>
                )}

                {/* Required Remarks Textarea */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-[#143A6B]">
                      Official Reason / Remarks <span className="text-[#B3261E]">*</span> (Min {minLen} characters)
                    </label>
                    <span className={`text-[11px] font-mono ${hasEnoughChars ? 'text-[#0E6A06] font-bold' : 'text-[#4A6280]'}`}>
                      {charCount} / {minLen} chars {charCount < minLen ? `(${minLen - charCount} more needed)` : '✓'}
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={confirmRemarks}
                    onChange={e => {
                      setConfirmRemarks(e.target.value);
                      if (confirmError) setConfirmError('');
                    }}
                    placeholder={
                      action === 'approve'
                        ? 'State the regulatory basis, no-dues verification check, or authority reference number...'
                        : 'Explain the justification for hold / rejection to be served formally to the college...'
                    }
                    className={`w-full p-2.5 border rounded-inner text-xs focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F] bg-white ${
                      confirmError ? 'border-[#B3261E] ring-1 ring-[#B3261E]' : 'border-[#DCE6F2]'
                    }`}
                  />
                  {confirmError && (
                    <div className="text-[11px] text-[#B3261E] font-semibold mt-1">
                      {confirmError}
                    </div>
                  )}
                </div>

                {/* Required Checkbox */}
                <label className="flex items-start gap-2.5 p-2.5 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmReviewedChecked}
                    onChange={e => {
                      setConfirmReviewedChecked(e.target.checked);
                      if (confirmError) setConfirmError('');
                    }}
                    className="mt-0.5 rounded text-[#1D6BB5] focus:ring-[#1D6BB5]"
                  />
                  <span className="text-[11px] font-semibold text-[#143A6B]">
                    I confirm I have reviewed the details and documents and authorize this regulatory decision.
                  </span>
                </label>

              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 bg-[#F3F7FC] border-t border-[#DCE6F2] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmModalData(null)}
                  className="px-4 py-2 border border-[#DCE6F2] bg-white hover:bg-gray-100 text-[#143A6B] text-xs font-semibold rounded-inner cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!hasEnoughChars || !confirmReviewedChecked || isSubmittingDecision}
                  onClick={handleExecuteDecision}
                  className={`px-5 py-2 text-xs font-bold rounded-inner flex items-center gap-1.5 shadow-soft transition-colors ${
                    hasEnoughChars && confirmReviewedChecked && !isSubmittingDecision
                      ? `${actionBtnColor} cursor-pointer`
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  }`}
                >
                  {isSubmittingDecision ? (
                    <span>Executing Decision...</span>
                  ) : (
                    <span>Confirm {actionTitle.toLowerCase()}</span>
                  )}
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* DISCREPANCY / CORRECTED DOC ACTION MODAL FOR BANK VERIFICATION */}
      {bankActionModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-labelledby="bank-action-modal-title"
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmittingBankAction) {
              setBankActionModal(null);
              setBankActionErrors({});
            }
          }}
        >
          <div className="bg-white rounded-card shadow-float max-w-lg w-full border border-[#DCE6F2] overflow-hidden">
            <div className="px-6 py-4 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#B3261E]" />
                <h3 id="bank-action-modal-title" className="text-sm font-bold text-[#143A6B]">
                  {bankActionModal.type === 'discrepancy'
                    ? `Serve Regulatory Notice — ${maskFdrNumber(bankActionModal.fdrNumber, !maskFdrNumberState)}`
                    : `Request Corrected Document — ${maskFdrNumber(bankActionModal.fdrNumber, !maskFdrNumberState)}`}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingBankAction}
                onClick={() => {
                  setBankActionModal(null);
                  setBankActionErrors({});
                }}
                aria-label="Close modal"
                className="text-[#4A6280] hover:text-[#143A6B] text-lg font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {/* Reason / Regulatory Ground Dropdown */}
              <div>
                <label className="font-bold text-[#143A6B] block mb-1">
                  Regulatory Ground / Discrepancy Category <span className="text-[#B3261E]">*</span>
                </label>
                <select
                  value={bankActionReason}
                  onChange={e => {
                    setBankActionReason(e.target.value);
                    if (bankActionErrors.reason) {
                      setBankActionErrors(prev => ({ ...prev, reason: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 text-xs border rounded-inner min-h-[38px] text-[#17324F] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] ${
                    bankActionErrors.reason ? 'border-[#B3261E] bg-[#FDECEA]/30' : 'border-[#DCE6F2]'
                  }`}
                >
                  <option value="">-- Choose Regulatory Discrepancy Ground --</option>
                  <option value="Amount mismatch between bank confirmation and submitted instrument">
                    Amount mismatch between bank confirmation and submitted instrument
                  </option>
                  <option value="Joint Lien not marked in favour of AICTE in bank records">
                    Joint Lien not marked in favour of AICTE in bank records
                  </option>
                  <option value="Account holder / College trust name mismatch">
                    Account holder / College trust name mismatch
                  </option>
                  <option value="Tenure / Maturity date mismatch">
                    Tenure / Maturity date mismatch
                  </option>
                  <option value="Bank branch / IFSC code discrepancy">
                    Bank branch / IFSC code discrepancy
                  </option>
                  <option value="Interest rate discrepancy">
                    Interest rate discrepancy
                  </option>
                  <option value="Missing mandatory joint lien covenant / auto-renewal clause">
                    Missing mandatory joint lien covenant / auto-renewal clause
                  </option>
                  <option value="Other regulatory non-compliance">
                    Other regulatory non-compliance
                  </option>
                </select>
                {bankActionErrors.reason && (
                  <p className="text-[11px] text-[#B3261E] mt-1 font-semibold flex items-center gap-1">
                    <span>⚠</span> {bankActionErrors.reason}
                  </p>
                )}
              </div>

              {/* Justification / Remarks */}
              <div>
                <label className="font-bold text-[#143A6B] block mb-1">
                  Regulatory Justification / Discrepancy Remarks <span className="text-[#B3261E]">*</span>
                </label>
                <textarea
                  rows={4}
                  value={bankActionRemarks}
                  onChange={e => {
                    setBankActionRemarks(e.target.value);
                    if (bankActionErrors.remarks) {
                      setBankActionErrors(prev => ({ ...prev, remarks: undefined }));
                    }
                  }}
                  placeholder="Detail the exact parameter discrepancies, bank API findings, or compliance directives..."
                  className={`w-full p-2.5 border rounded-inner text-xs focus:ring-2 focus:ring-[#1D6BB5] text-[#17324F] bg-[#F8FAFD] focus:bg-white ${
                    bankActionErrors.remarks ? 'border-[#B3261E] bg-[#FDECEA]/30' : 'border-[#DCE6F2]'
                  }`}
                />
                {bankActionErrors.remarks && (
                  <p className="text-[11px] text-[#B3261E] mt-1 font-semibold flex items-center gap-1">
                    <span>⚠</span> {bankActionErrors.remarks}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-[#4A6280] bg-[#F8FAFD] p-3 rounded-inner border border-[#DCE6F2]/60">
                This notice will be recorded into the cryptographic SHA-256 audit chain, trigger an instant alert for the college administrative portal, and shift instrument status to <strong>Discrepancy Flagged</strong>.
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F3F7FC] border-t border-[#DCE6F2] flex justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingBankAction}
                onClick={() => {
                  setBankActionModal(null);
                  setBankActionErrors({});
                }}
                className="px-4 py-2 border border-[#DCE6F2] bg-white hover:bg-gray-100 text-[#143A6B] text-xs font-semibold rounded-inner cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingBankAction}
                onClick={async () => {
                  const errors: { reason?: string; remarks?: string } = {};
                  if (!bankActionReason.trim()) {
                    errors.reason = 'Please select a regulatory discrepancy ground.';
                  }
                  if (!bankActionRemarks.trim()) {
                    errors.remarks = 'Please provide detailed regulatory remarks.';
                  }
                  if (Object.keys(errors).length > 0) {
                    setBankActionErrors(errors);
                    return;
                  }

                  setBankActionErrors({});
                  setIsSubmittingBankAction(true);

                  try {
                    const institutionName = 
                      bankActionModal.institutionName || 
                      fdrList.find(f => f.id === bankActionModal.fdrId)?.institutionName || 
                      'institution';

                    if (bankActionModal.type === 'discrepancy') {
                      await raiseBankDiscrepancy(
                        bankActionModal.bcId || bankActionModal.fdrId,
                        bankActionRemarks.trim(),
                        bankActionReason.trim()
                      );
                      toast.success(`Regulatory notice sent to ${institutionName}`);
                    } else {
                      await updateFDRStatus(
                        bankActionModal.fdrId,
                        'Discrepancy Flagged',
                        `[${bankActionReason.trim()}] ${bankActionRemarks.trim()}`
                      );
                      toast.success(`Regulatory notice sent to ${institutionName}`);
                    }
                    setBankActionModal(null);
                    setBankActionReason('');
                    setBankActionRemarks('');
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to send regulatory notice');
                  } finally {
                    setIsSubmittingBankAction(false);
                  }
                }}
                className="px-4 py-2 bg-[#B3261E] hover:bg-[#9F1D14] text-white text-xs font-semibold rounded-inner cursor-pointer shadow-soft flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingBankAction ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Notice...</span>
                  </>
                ) : (
                  <span>Send Regulatory Notice</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      <DocumentViewerModal
        document={viewerDoc}
        onClose={() => setViewerDoc(null)}
      />

    </div>
  );
};
