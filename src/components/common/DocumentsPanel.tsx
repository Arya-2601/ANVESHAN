import React, { useState } from 'react';
import { AppDocument, UserRole } from '../../types';
import { DocumentViewerModal } from './DocumentViewerModal';
import { FileText, Eye, Download, RefreshCw, UploadCloud, CheckCircle2, History } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

interface DocumentsPanelProps {
  documents: AppDocument[];
  fdrId: string;
  fdrNumber?: string;
  currentRole: UserRole;
  onReplaceResubmit?: () => void;
  isLoading?: boolean;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
  documents,
  currentRole,
  onReplaceResubmit,
  isLoading = false,
}) => {
  const [activeDoc, setActiveDoc] = useState<AppDocument | null>(null);

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'fdr_scan': return 'FDR Scan';
      case 'release_resolution': return 'Release Resolution';
      case 'no_dues': return 'No Dues Order';
      case 'renewal': return 'Renewal Certificate';
      case 'resubmission': return 'Resubmission';
      default: return 'Supporting Document';
    }
  };

  return (
    <div className="bg-white rounded-[12px] border border-[#DCE6F2] shadow-soft overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3.5 bg-[#F3F7FC] border-b border-[#DCE6F2] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#1D6BB5]" />
          <h3 className="text-xs uppercase font-bold tracking-[0.8px] text-[#143A6B]">
            Uploaded Documents & Version History ({documents.length})
          </h3>
        </div>

        {currentRole === 'institution' && onReplaceResubmit && (
          <button
            onClick={onReplaceResubmit}
            className="min-h-[32px] px-3 py-1 bg-[#1D6BB5] hover:bg-[#143A6B] text-white text-xs font-semibold rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Replace / Resubmit</span>
          </button>
        )}
      </div>

      {/* Document List */}
      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="py-6 text-center text-xs text-[#4A6280]">Loading documents from storage...</div>
        ) : documents.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#4A6280] flex flex-col items-center justify-center gap-2">
            <UploadCloud className="w-8 h-8 text-[#A0B0C0]" />
            <span>No documents uploaded yet</span>
          </div>
        ) : (
          documents.map(doc => {
            const isCurrent = doc.status === 'current';
            const fileUrl = `/api/documents/${doc.id}/file`;

            return (
              <div
                key={doc.id}
                className={`p-3.5 rounded-[8px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent 
                    ? 'bg-white border-[#DCE6F2] hover:border-[#1D6BB5] shadow-xs' 
                    : 'bg-[#F8FAFD] border-[#E2E8F0] opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-[8px] shrink-0 ${isCurrent ? 'bg-[#E3EEFB] text-[#1D6BB5]' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs text-[#17324F]">{doc.originalName}</span>
                      
                      {/* Version Badge */}
                      <span className="text-[10px] bg-[#143A6B] text-white font-mono font-bold px-1.5 py-0.5 rounded-full">
                        v{doc.version}
                      </span>

                      {/* Status Chip */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isCurrent 
                          ? 'bg-[#E6F4EA] text-[#0E6A06] border border-[#138808]/30' 
                          : 'bg-[#F1F5F9] text-[#64748B] border border-[#CBD5E1]'
                      }`}>
                        {isCurrent ? <CheckCircle2 className="w-3 h-3 text-[#0E6A06]" /> : <History className="w-3 h-3" />}
                        <span>{isCurrent ? 'Current' : 'Superseded'}</span>
                      </span>

                      {/* Category Label */}
                      <span className="text-[10px] bg-[#F3F7FC] text-[#1D6BB5] font-semibold px-2 py-0.5 rounded-inner border border-[#DCE6F2]">
                        {getCategoryLabel(doc.category)}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#4A6280] mt-1 flex items-center gap-3">
                      <span>Uploaded by: <strong className="text-[#17324F]">{doc.uploadedByRole === 'official' ? 'AICTE Bureau' : 'College'}</strong></span>
                      <span>•</span>
                      <span>{formatDate(doc.uploadedAt)}</span>
                      <span>•</span>
                      <span>{(doc.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setActiveDoc(doc)}
                    className="min-h-[34px] px-3 py-1.5 bg-[#1D6BB5] hover:bg-[#143A6B] text-white text-xs font-semibold rounded-[6px] flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="View Document Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>

                  <a
                    href={fileUrl}
                    download={doc.originalName}
                    target="_blank"
                    rel="noreferrer"
                    className="min-h-[34px] px-3 py-1.5 bg-white border border-[#DCE6F2] hover:bg-[#F3F7FC] text-[#143A6B] text-xs font-semibold rounded-[6px] flex items-center gap-1 transition-colors cursor-pointer"
                    title="Download File"
                  >
                    <Download className="w-3.5 h-3.5 text-[#1D6BB5]" />
                    <span>Download</span>
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Viewer Modal */}
      {activeDoc && (
        <DocumentViewerModal
          isOpen={!!activeDoc}
          onClose={() => setActiveDoc(null)}
          documentUrl={`/api/documents/${activeDoc.id}/file`}
          documentName={activeDoc.originalName}
          category={activeDoc.category}
          version={activeDoc.version}
        />
      )}
    </div>
  );
};
