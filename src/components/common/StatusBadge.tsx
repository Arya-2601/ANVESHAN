import React from 'react';
import { FDRStatus } from '../../types';
import { CheckCircle2, AlertTriangle, Clock, RefreshCw, ShieldCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: FDRStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  let bg = 'bg-[#F3F7FC] text-[#4A6280] border-[#DCE6F2]';
  let icon = <Clock className="w-3.5 h-3.5 inline mr-1" />;

  switch (status) {
    case 'Active/Verified':
    case 'Approved':
    case 'Active':
      bg = 'bg-[#EBF7EB] text-[#0E6A06] border-[#138808]/40';
      icon = <CheckCircle2 className="w-3.5 h-3.5 inline mr-1 text-[#0E6A06]" />;
      break;

    case 'Pending Scrutiny':
    case 'Pending Bank Verification':
    case 'Expiring Soon':
    case 'Pending':
    case 'Requested':
      bg = 'bg-[#FFF1D6] text-[#7A4A00] border-[#B26A00]/40';
      icon = <Clock className="w-3.5 h-3.5 inline mr-1 text-[#7A4A00]" />;
      break;

    case 'Discrepancy Flagged':
    case 'Expired':
    case 'Rejected':
      bg = 'bg-[#FDECEA] text-[#9F1D14] border-[#F0C4BF]';
      icon = <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-[#9F1D14]" />;
      break;

    case 'Renewed':
    case 'Under Review':
    case 'Info':
      bg = 'bg-[#E3EEFB] text-[#1D6BB5] border-[#1D6BB5]/40';
      icon = <RefreshCw className="w-3.5 h-3.5 inline mr-1 text-[#1D6BB5]" />;
      break;

    case 'Released':
    case 'Closed':
      bg = 'bg-[#F3F7FC] text-[#4A6280] border-[#DCE6F2]';
      icon = <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-[#4A6280]" />;
      break;

    default:
      bg = 'bg-[#F3F7FC] text-[#4A6280] border-[#DCE6F2]';
      icon = <Clock className="w-3.5 h-3.5 inline mr-1" />;
      break;
  }

  const sizeClass = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs font-semibold px-2.5 py-0.5',
    lg: 'text-sm font-bold px-3 py-1',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${bg} ${sizeClass} tracking-tight transition-all`}
    >
      {icon}
      <span>{status}</span>
    </span>
  );
};
