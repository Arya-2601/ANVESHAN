import React from 'react';
import { X, Download, FileText, ExternalLink } from 'lucide-react';
import { AppDocument } from '../../types';

interface DocumentViewerModalProps {
  isOpen?: boolean;
  onClose: () => void;
  documentUrl?: string;
  documentName?: string;
  category?: string;
  version?: number;
  document?: AppDocument | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  documentUrl,
  documentName,
  category,
  version,
  document,
}) => {
  const effectiveOpen = isOpen !== undefined ? isOpen : !!document;
  if (!effectiveOpen) return null;

  const url = document ? `/api/documents/${document.id}/file` : (documentUrl || '');
  const name = document ? document.originalName : (documentName || 'Document');
  const cat = document ? document.category : category;
  const ver = document ? document.version : version;

  const isPdf = name.toLowerCase().endsWith('.pdf') || url.includes('.pdf') || (document?.mimeType === 'application/pdf');
  const isImage = name.match(/\.(png|jpe?g|webp|gif)$/i) || url.match(/\.(png|jpe?g|webp|gif)$/i) || (document?.mimeType.startsWith('image/'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-[12px] shadow-[0_12px_32px_rgba(20,58,107,0.2)] border border-[#DCE6F2] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
        
        {/* Header in --blue-600 */}
        <div className="px-6 py-3.5 bg-[#1D6BB5] text-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <FileText className="w-5 h-5 shrink-0 text-blue-100" />
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold truncate">{name}</h3>
                {ver !== undefined && (
                  <span className="text-[10px] bg-white/20 text-white font-mono font-semibold px-2 py-0.5 rounded-full shrink-0">
                    v{ver}
                  </span>
                )}
                {cat && (
                  <span className="text-[10px] bg-[#E3EEFB] text-[#143A6B] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {cat.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={url}
              download={name}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-[8px] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download Document"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
            
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-[8px] transition-colors cursor-pointer"
              title="Close Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 bg-[#F8FAFD] p-2 overflow-auto flex items-center justify-center min-h-[450px]">
          {isPdf ? (
            <iframe
              src={url}
              title={name}
              className="w-full h-[70vh] border border-[#DCE6F2] rounded-[8px] bg-white shadow-inner"
            />
          ) : isImage ? (
            <div className="max-h-[70vh] overflow-auto p-4 flex items-center justify-center">
              <img
                src={url}
                alt={name}
                className="max-h-[65vh] object-contain rounded-[8px] border border-[#DCE6F2] shadow-soft"
              />
            </div>
          ) : (
            <iframe
              src={url}
              title={name}
              className="w-full h-[70vh] border border-[#DCE6F2] rounded-[8px] bg-white"
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-2.5 bg-white border-t border-[#DCE6F2] flex items-center justify-between text-xs text-[#4A6280]">
          <div>AICTE Anveshan Cryptographic Verification Store</div>
          <button
            onClick={onClose}
            className="min-h-[36px] px-4 py-1.5 bg-[#143A6B] hover:bg-[#1D6BB5] text-white font-semibold rounded-[8px] transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>

      </div>
    </div>
  );
};
