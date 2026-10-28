import React, { useState } from 'react';
import { 
  TermsOfServiceModal, 
  PrivacyPolicyModal, 
  TermsAndComplianceModal, 
  HelpModal 
} from './InfoModals';
import { ShieldCheck, Database } from 'lucide-react';

export const Footer: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  return (
    <footer className="bg-white border-t border-[#DCE6F2] mt-auto py-5 px-4 text-xs text-[#4A6280]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Branding & Logo */}
        <div className="flex items-center space-x-3">
          <img 
            src="/assets/aicte-logo.png" 
            alt="AICTE Logo" 
            className="h-8 w-8 object-contain"
          />
          <div>
            <div className="font-bold text-[#143A6B]">
              All India Council for Technical Education (AICTE)
            </div>
            <div className="text-[11px] text-[#4A6280]">
              Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
            </div>
          </div>
        </div>

        {/* Working Links Separated by "|" */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[#4A6280] text-xs">
          <button
            onClick={() => setActiveModal('tos')}
            className="hover:text-[#1D6BB5] transition-colors cursor-pointer"
          >
            Terms of Service
          </button>
          <span className="text-[#DCE6F2]">|</span>
          <button
            onClick={() => setActiveModal('privacy')}
            className="hover:text-[#1D6BB5] transition-colors cursor-pointer"
          >
            Privacy Policy
          </button>
          <span className="text-[#DCE6F2]">|</span>
          <button
            onClick={() => setActiveModal('compliance')}
            className="hover:text-[#1D6BB5] transition-colors cursor-pointer"
          >
            Terms and Compliance
          </button>
          <span className="text-[#DCE6F2]">|</span>
          <button
            onClick={() => setActiveModal('help')}
            className="hover:text-[#1D6BB5] transition-colors cursor-pointer"
          >
            Help
          </button>
        </div>

        {/* Right Status notes & Copyright */}
        <div className="text-[11px] text-[#4A6280] text-center md:text-right space-y-1">
          <div className="flex items-center justify-center md:justify-end gap-3 text-[11px]">
            <span className="inline-flex items-center gap-1 text-[#4A6280]">
              <Database className="w-3 h-3 text-[#1D6BB5]" />
              <span>Bank confirmation simulated</span>
            </span>
            <span className="text-[#DCE6F2]">•</span>
            <span className="inline-flex items-center gap-1 text-[#0E6A06] font-medium">
              <ShieldCheck className="w-3 h-3" />
              <span>SHA-256 audit chain active</span>
            </span>
          </div>
          <div>
            © {new Date().getFullYear()} AICTE. All Rights Reserved · <span className="font-semibold text-[#143A6B]">ANVESHAN</span>
          </div>
        </div>
      </div>

      {/* Working Modals */}
      <TermsOfServiceModal 
        isOpen={activeModal === 'tos'} 
        onClose={() => setActiveModal(null)} 
      />
      <PrivacyPolicyModal 
        isOpen={activeModal === 'privacy'} 
        onClose={() => setActiveModal(null)} 
      />
      <TermsAndComplianceModal 
        isOpen={activeModal === 'compliance'} 
        onClose={() => setActiveModal(null)} 
      />
      <HelpModal 
        isOpen={activeModal === 'help'} 
        onClose={() => setActiveModal(null)} 
      />
    </footer>
  );
};
