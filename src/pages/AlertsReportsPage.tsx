import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { FDRRecord } from '../types';
import { formatINR, formatDate, getDaysUntilMaturity, maskFdrNumber } from '../utils/formatters';
import { StatusBadge } from '../components/common/StatusBadge';
import { 
  FileDown, 
  Clock, 
  AlertTriangle, 
  Bell, 
  Settings, 
  Save, 
  Check, 
  ArrowRight, 
  Building, 
  FileText,
  Calendar,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { jsPDF } from 'jspdf';

export const AlertsReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const { 
    fdrList, 
    reminderSettings, 
    updateReminderSettings, 
    maskFdrNumberState 
  } = useApp();

  // Time-sensitive chip filter: 'ALL' | '30' | '60' | '90'
  const [maturityChip, setMaturityChip] = useState<'ALL' | '30' | '60' | '90'>('ALL');

  // Local reminder settings state
  const [localReminders, setLocalReminders] = useState(reminderSettings);

  // Filtered records by maturity chip
  const filteredRecords = useMemo(() => {
    return fdrList.filter(f => {
      if (f.status === 'Released' || f.status === 'Rejected') return false;
      const days = getDaysUntilMaturity(f.maturityDate);

      if (maturityChip === '30') return days > 0 && days <= 30;
      if (maturityChip === '60') return days > 0 && days <= 60;
      if (maturityChip === '90') return days > 0 && days <= 90;
      return true;
    });
  }, [fdrList, maturityChip]);

  // Escalation Tracker cases: Unresolved Discrepancies
  const escalationCases = useMemo(() => {
    return fdrList.filter(f => f.status === 'Discrepancy Flagged');
  }, [fdrList]);

  // Report cards counts
  const pendingVerificationsCount = fdrList.filter(f => f.status === 'Pending Bank Verification').length;
  const upcomingMaturitiesCount = fdrList.filter(f => {
    const days = getDaysUntilMaturity(f.maturityDate);
    return days > 0 && days <= 90;
  }).length;
  const missingDocumentsCount = fdrList.filter(f => !f.documentName || f.status === 'Pending Scrutiny').length;
  const casesRequiringIntervention = escalationCases.length + upcomingMaturitiesCount;

  // Handle Export CSV
  const handleExportCSV = () => {
    const dataToExport = filteredRecords.map(f => ({
      'FDR Number': f.fdrNumber,
      'Institution ID': f.institutionId,
      'Institution Name': f.institutionName,
      'State': f.state,
      'Bank Name': f.bankName,
      'Branch IFSC': f.branchIfsc,
      'Principal Amount (INR)': f.principalAmount,
      'Issue Date': f.issueDate,
      'Maturity Date': f.maturityDate,
      'Days to Maturity': getDaysUntilMaturity(f.maturityDate),
      'Status': f.status,
      'Lien Marked': f.bankData?.lienMarkedToAICTE ? 'YES' : 'NO',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AICTE_ANVESHAN_FDR_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Report generated and downloaded successfully!');
  };

  // Handle Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(16);
    doc.setTextColor(18, 53, 91); // #12355B
    doc.text('ALL INDIA COUNCIL FOR TECHNICAL EDUCATION', 14, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(31, 111, 181); // #1F6FB5
    doc.text('ANVESHAN — Security Deposit & FDR Management Report', 14, 28);
    
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')} | Scope: ${maturityChip === 'ALL' ? 'Complete Active Portfolio' : `Maturing in ${maturityChip} Days`}`, 14, 35);
    
    doc.setDrawColor(217, 226, 236);
    doc.line(14, 38, 196, 38);

    // Summary line
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(`Total Records: ${filteredRecords.length} | Interventions Required: ${casesRequiringIntervention}`, 14, 45);

    // Table
    let startY = 55;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('FDR No.', 14, startY);
    doc.text('Institution', 45, startY);
    doc.text('Bank', 105, startY);
    doc.text('Amount (INR)', 140, startY);
    doc.text('Maturity', 170, startY);

    doc.line(14, startY + 2, 196, startY + 2);
    startY += 8;

    doc.setFont('helvetica', 'normal');
    filteredRecords.slice(0, 20).forEach((f, idx) => {
      if (startY > 270) {
        doc.addPage();
        startY = 20;
      }
      doc.text(f.fdrNumber, 14, startY);
      doc.text(f.institutionName.slice(0, 28), 45, startY);
      doc.text(f.bankName.slice(0, 16), 105, startY);
      doc.text(`₹ ${f.principalAmount.toLocaleString('en-IN')}`, 140, startY);
      doc.text(f.maturityDate, 170, startY);
      startY += 7;
    });

    if (filteredRecords.length > 20) {
      doc.text(`... and ${filteredRecords.length - 20} additional instruments listed in portal.`, 14, startY + 4);
    }

    doc.save(`AICTE_ANVESHAN_Official_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('Official PDF Report downloaded successfully!');
  };

  const handleSaveReminderSettings = () => {
    updateReminderSettings(localReminders);
    toast.success('Maturity reminder configuration saved to state!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* SECTION 7: Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#4A6280]">
        <Link to="/" className="text-[#1D6BB5] hover:underline font-semibold">Home</Link>
        <span>/</span>
        <span className="font-bold text-[#143A6B]">Reports & Alerts</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#DCE6F2] pb-4">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 text-[#4A6280] hover:text-[#143A6B] hover:bg-[#F3F7FC] rounded-[8px] cursor-pointer transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#143A6B]">
              Regulatory Alerts & Comprehensive Reports
            </h1>
            <p className="text-xs text-[#4A6280] mt-0.5">
              Time-sensitive maturity monitoring, escalation tracking, and compliance export center.
            </p>
          </div>
        </div>

        {/* Export Center Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="min-h-[40px] px-4 py-2 bg-white border border-[#DCE6F2] hover:bg-[#F3F7FC] text-[#143A6B] font-semibold text-xs rounded-[8px] shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4 text-[#1D6BB5]" />
            <span>Download .CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="min-h-[40px] px-4 py-2 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold text-xs rounded-[8px] shadow-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span>Download .PDF</span>
          </button>
        </div>
      </div>

      {/* REPORT METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-[12px] border border-[#DCE6F2] border-t-4 border-t-[#B26A00] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Pending Verifications
          </div>
          <div className="text-[30px] font-extrabold text-[#7A4A00] mt-1 leading-tight">{pendingVerificationsCount}</div>
          <div className="text-xs text-[#4A6280] mt-0.5">Under bank cross-verification</div>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-[#DCE6F2] border-t-4 border-t-[#B26A00] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Upcoming Maturities (&lt;90d)
          </div>
          <div className="text-[30px] font-extrabold text-[#7A4A00] mt-1 leading-tight">{upcomingMaturitiesCount}</div>
          <div className="text-xs text-[#4A6280] mt-0.5">Urgent renewal notices active</div>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-[#DCE6F2] border-t-4 border-t-[#1D6BB5] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Scrutiny In-Queue
          </div>
          <div className="text-[30px] font-extrabold text-[#143A6B] mt-1 leading-tight">{missingDocumentsCount}</div>
          <div className="text-xs text-[#4A6280] mt-0.5">Fresh institutional submissions</div>
        </div>

        <div className="bg-white p-5 rounded-[12px] border border-[#DCE6F2] border-t-4 border-t-[#B3261E] shadow-[0_1px_3px_rgba(20,58,107,0.08)]">
          <div className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px]">
            Critical Interventions
          </div>
          <div className="text-[30px] font-extrabold text-[#9F1D14] mt-1 leading-tight">{casesRequiringIntervention}</div>
          <div className="text-xs text-[#9F1D14] mt-0.5 font-medium">Action overdue / flagged</div>
        </div>
      </div>

      {/* ESCALATION TRACKER (Unresolved Discrepancies) */}
      <div className="bg-white rounded-[12px] border border-[#F0C4BF] shadow-[0_1px_3px_rgba(20,58,107,0.08)] overflow-hidden">
        <div className="px-6 py-4 bg-[#FDECEA] border-b border-[#F0C4BF] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-[#B3261E]" />
            <div>
              <h2 className="text-sm font-bold text-[#9F1D14]">
                Escalation Tracker: Discrepancy Cases Exceeding Response SLA
              </h2>
              <p className="text-xs text-[#9F1D14] mt-0.5">
                Instruments with confirmed bank discrepancies awaiting college resolution or bureau action.
              </p>
            </div>
          </div>
          <span className="text-xs bg-[#B3261E] text-white px-3 py-1 rounded-full font-bold shadow-xs">
            {escalationCases.length} Escalations
          </span>
        </div>

        <div className="divide-y divide-[#F0C4BF]/60">
          {escalationCases.map(esc => (
            <div
              key={esc.id}
              onClick={() => navigate(`/official/fdr/${esc.id}`)}
              className="p-4 hover:bg-[#FDECEA]/30 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-medium text-[#143A6B] text-xs">{esc.fdrNumber}</span>
                  <span className="text-xs font-semibold text-[#17324F]">{esc.institutionName}</span>
                  <span className="text-[10px] bg-[#F3F7FC] text-[#1D6BB5] px-2 py-0.5 rounded-full font-mono font-medium border border-[#DCE6F2]">
                    {esc.institutionId}
                  </span>
                </div>
                <p className="text-xs text-[#9F1D14] mt-1">
                  <strong>Flag Details:</strong> {esc.discrepancyRemarks}
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0 text-xs">
                <div className="text-right">
                  <div className="font-bold text-[#17324F]">{formatINR(esc.principalAmount)}</div>
                  <div className="text-[10px] text-[#4A6280]">{esc.bankName}</div>
                </div>
                <Link
                  to={`/official/fdr/${esc.id}`}
                  className="min-h-[36px] px-3.5 py-1.5 bg-[#B3261E] hover:bg-[#9F1D14] text-white font-semibold rounded-[8px] text-xs flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <span>Resolve Case</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TIME-SENSITIVE MATURITY CHIPS & FILTERED TABLE */}
      <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] overflow-hidden">
        <div className="p-6 border-b border-[#DCE6F2] bg-[#F3F7FC] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[#143A6B]">
              Deposit Maturity Timeline & Instrument Portfolio
            </h2>
            <p className="text-xs text-[#4A6280] mt-0.5">
              Filter by urgency horizon to review renewals due and trigger notices.
            </p>
          </div>

          {/* Working Chip Toggles */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMaturityChip('ALL')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                maturityChip === 'ALL'
                  ? 'bg-[#143A6B] text-white shadow-xs'
                  : 'bg-white border border-[#DCE6F2] text-[#4A6280] hover:bg-[#F3F7FC]'
              }`}
            >
              All Instruments ({fdrList.length})
            </button>
            <button
              onClick={() => setMaturityChip('90')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                maturityChip === '90'
                  ? 'bg-[#F5A623] text-white shadow-xs'
                  : 'bg-white border border-[#DCE6F2] text-[#4A6280] hover:bg-[#F3F7FC]'
              }`}
            >
              &lt; 90 Days
            </button>
            <button
              onClick={() => setMaturityChip('60')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                maturityChip === '60'
                  ? 'bg-[#B26A00] text-white shadow-xs'
                  : 'bg-white border border-[#DCE6F2] text-[#4A6280] hover:bg-[#F3F7FC]'
              }`}
            >
              &lt; 60 Days
            </button>
            <button
              onClick={() => setMaturityChip('30')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                maturityChip === '30'
                  ? 'bg-[#B3261E] text-white shadow-xs'
                  : 'bg-white border border-[#DCE6F2] text-[#4A6280] hover:bg-[#F3F7FC]'
              }`}
            >
              &lt; 30 Days (Urgent)
            </button>
          </div>
        </div>

        {/* Filtered Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#DCE6F2] text-xs">
            <thead className="bg-[#F3F7FC]">
              <tr>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">FDR Account No.</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Institution & State</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Bank</th>
                <th className="px-4 py-3 text-right font-bold uppercase tracking-[0.8px] text-[#143A6B]">Deposit Sum</th>
                <th className="px-4 py-3 text-left font-bold uppercase tracking-[0.8px] text-[#143A6B]">Maturity Date</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Days Remaining</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Status</th>
                <th className="px-4 py-3 text-center font-bold uppercase tracking-[0.8px] text-[#143A6B]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE6F2] bg-white">
              {filteredRecords.map(fdr => {
                const days = getDaysUntilMaturity(fdr.maturityDate);
                return (
                  <tr
                    key={fdr.id}
                    onClick={() => navigate(`/official/fdr/${fdr.id}`)}
                    className="hover:bg-[#F3F8FD] transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-[#143A6B]">
                      {maskFdrNumber(fdr.fdrNumber, !maskFdrNumberState)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#17324F]">{fdr.institutionName}</div>
                      <div className="text-[10px] text-[#4A6280]">{fdr.state}</div>
                    </td>
                    <td className="px-4 py-3 text-[#17324F]">{fdr.bankName}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#17324F]">{formatINR(fdr.principalAmount)}</td>
                    <td className="px-4 py-3 text-[#17324F]">{formatDate(fdr.maturityDate)}</td>
                    <td className="px-4 py-3 text-center font-bold">
                      <span className={days <= 30 ? 'text-[#9F1D14]' : days <= 60 ? 'text-[#7A4A00]' : 'text-[#4A6280]'}>
                        {days > 0 ? `${days} Days` : 'Matured'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={fdr.status} /></td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <Link
                        to={`/official/fdr/${fdr.id}`}
                        className="min-h-[32px] px-3 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white rounded-[8px] text-xs font-semibold cursor-pointer inline-flex items-center shadow-xs transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIGURABLE MATURITY REMINDER SETTINGS */}
      <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-[0_1px_3px_rgba(20,58,107,0.08)] p-6 space-y-4">
        <div className="flex items-center space-x-2 border-b border-[#DCE6F2] pb-3">
          <Settings className="w-5 h-5 text-[#1D6BB5]" />
          <h2 className="text-base font-bold text-[#143A6B]">
            Automated Maturity & Escalation Alert Configuration
          </h2>
        </div>

        <p className="text-xs text-[#4A6280]">
          Configure automated institutional reminder dispatch thresholds. Notices are automatically dispatched to college Registrars and Bank Branch Managers.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <label className="flex items-center space-x-2 text-xs font-semibold text-[#17324F] cursor-pointer">
            <input
              type="checkbox"
              checked={localReminders.reminder90Days}
              onChange={e => setLocalReminders(prev => ({ ...prev, reminder90Days: e.target.checked }))}
              className="rounded text-[#1D6BB5] focus:ring-[#1D6BB5]"
            />
            <span>Trigger at 90 Days</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-semibold text-[#17324F] cursor-pointer">
            <input
              type="checkbox"
              checked={localReminders.reminder60Days}
              onChange={e => setLocalReminders(prev => ({ ...prev, reminder60Days: e.target.checked }))}
              className="rounded text-[#1D6BB5] focus:ring-[#1D6BB5]"
            />
            <span>Trigger at 60 Days</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-semibold text-[#17324F] cursor-pointer">
            <input
              type="checkbox"
              checked={localReminders.reminder30Days}
              onChange={e => setLocalReminders(prev => ({ ...prev, reminder30Days: e.target.checked }))}
              className="rounded text-[#1D6BB5] focus:ring-[#1D6BB5]"
            />
            <span>Trigger at 30 Days</span>
          </label>

          <label className="flex items-center space-x-2 text-xs font-semibold text-[#17324F] cursor-pointer">
            <input
              type="checkbox"
              checked={localReminders.reminder15Days}
              onChange={e => setLocalReminders(prev => ({ ...prev, reminder15Days: e.target.checked }))}
              className="rounded text-[#1D6BB5] focus:ring-[#1D6BB5]"
            />
            <span>Trigger at 15 Days (Urgent)</span>
          </label>
        </div>

        <div className="pt-3 border-t border-[#DCE6F2] flex justify-end">
          <button
            onClick={handleSaveReminderSettings}
            className="min-h-[40px] px-5 py-2 bg-[#1D6BB5] hover:bg-[#143A6B] text-white text-xs font-semibold rounded-[8px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Reminder Rules</span>
          </button>
        </div>
      </div>

    </div>
  );
};
