import React from 'react';
import { X, ShieldCheck, HelpCircle, FileText, Phone, Mail, Building } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BaseModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#143A6B]/50 backdrop-blur-2xs animate-fadeIn">
      <div 
        className="bg-white rounded-card shadow-float border border-[#DCE6F2] w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-scaleUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header in --blue-600 (not near-black) */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1D6BB5] text-white">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-sm text-[#17324F] leading-relaxed space-y-4">
          {children}
        </div>
        <div className="px-6 py-3 border-t border-[#DCE6F2] bg-[#F3F7FC] flex justify-end">
          <button
            onClick={onClose}
            className="min-h-[40px] px-5 bg-[#1D6BB5] text-white text-xs font-semibold rounded-inner hover:bg-[#143A6B] transition-colors cursor-pointer shadow-soft"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export const TermsOfServiceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Terms of Service — AICTE FDR Portal">
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#1D6BB5] font-semibold text-xs uppercase tracking-[0.8px]">
        <FileText className="w-4 h-4" />
        <span>Statutory Authority & Regulations</span>
      </div>
      <p>
        The AICTE Security Deposit / FDR Management Portal (ANVESHAN) is operated by the Regulation Bureau, All India Council for Technical Education, Ministry of Education, Government of India.
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">1. Mandatory Security Deposit Guidelines</h4>
      <p>
        All technical institutions approved under the AICTE Act 1987 must maintain mandatory security deposits in the form of Fixed Deposit Receipts (FDR) issued jointly in the name of the Authorized Signatory of the Society/Trust and the Regional Directorate, AICTE.
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">2. Accuracy and Authenticity</h4>
      <p>
        Colleges must guarantee that all scanned FDR documents, instrument numbers, branch IFSC codes, and deposit amounts submitted match the actual bank instruments without falsification or misrepresentation.
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">3. Digital Bank Reconciliation</h4>
      <p>
        AICTE reserves the right to electronically cross-verify and query authorized core banking interfaces for live confirmation of lien marking and unencumbered deposit status.
      </p>
    </div>
  </BaseModal>
);

export const PrivacyPolicyModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Privacy Policy — Data Protection">
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#0E6A06] font-semibold text-xs uppercase tracking-[0.8px]">
        <ShieldCheck className="w-4 h-4" />
        <span>Confidentiality & Data Protection Standards</span>
      </div>
      <p>
        This portal adheres to the Digital Personal Data Protection (DPDP) Act and Government of India Cybersecurity guidelines for protecting sensitive institutional financial records.
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">1. Information Collected</h4>
      <p>
        ANVESHAN records institutional registration identifiers, authorized administrative contact information, bank FDR instrument certificates, and official scrutiny audit logs.
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">2. Encryption & Security</h4>
      <p>
        All deposit account details and banking communication keys are protected using AES-256 GCM encryption at rest and TLS 1.3 in transit. Access is governed by strict Role-Based Access Control (RBAC).
      </p>
      <h4 className="font-bold text-[#143A6B] mt-2">3. Non-Disclosure</h4>
      <p>
        Financial data is strictly used for statutory regulatory compliance and is not disclosed to third parties except authorized banking verification bridges.
      </p>
    </div>
  </BaseModal>
);

export const TermsAndComplianceModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="Terms and Compliance Guidelines">
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#143A6B] font-semibold text-xs uppercase tracking-[0.8px]">
        <Building className="w-4 h-4" />
        <span>Regulatory Compliance Norms (AICTE Approval Process Handbook)</span>
      </div>
      <p>
        Compliance criteria for Security Deposit Maintenance under Chapter 1 of the Approval Process Handbook (APH):
      </p>
      <ul className="list-disc list-inside space-y-2 text-[#17324F]">
        <li><strong>Tenure Requirement:</strong> FDRs must be maintained for a minimum tenure of 8 to 10 years for new technical institutions, or as stipulated in the letter of approval.</li>
        <li><strong>Lien Marking:</strong> The bank receipt must explicitly carry the clause: <em>"Lien marked in favour of Regional Directorate, AICTE"</em>.</li>
        <li><strong>Premature Encashment:</strong> No college is permitted to prematurely encash or borrow loans against AICTE lien-marked FDRs without written no-objection certificates.</li>
        <li><strong>Annual Renewal:</strong> In cases of 1-year or 3-year renewable instruments, renewal must be submitted at least 60 days before maturity.</li>
      </ul>
    </div>
  </BaseModal>
);

export const HelpModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => (
  <BaseModal isOpen={isOpen} onClose={onClose} title="ANVESHAN Helpdesk & Support">
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[#1D6BB5] font-semibold text-xs uppercase tracking-[0.8px]">
        <HelpCircle className="w-4 h-4" />
        <span>AICTE Technical & Regulation Helpdesk</span>
      </div>
      <p>
        For technical assistance, FDR submission queries, or bank API status synchronization:
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="p-3 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] flex items-start gap-3">
          <Phone className="w-5 h-5 text-[#1D6BB5] mt-0.5 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-[#4A6280] uppercase tracking-[0.8px]">Toll-Free Helpline</div>
            <div className="text-sm font-bold text-[#143A6B]">1800-11-2323 / 011-29581000</div>
            <div className="text-xs text-[#4A6280]">Mon - Fri: 9:30 AM – 5:30 PM</div>
          </div>
        </div>
        <div className="p-3 bg-[#F3F7FC] rounded-inner border border-[#DCE6F2] flex items-start gap-3">
          <Mail className="w-5 h-5 text-[#143A6B] mt-0.5 shrink-0" />
          <div>
            <div className="font-bold text-[11px] text-[#4A6280] uppercase tracking-[0.8px]">Official Email</div>
            <div className="text-sm font-bold text-[#143A6B]">fdr-support@aicte-india.org</div>
            <div className="text-xs text-[#4A6280]">Response turnaround: 24-48 hrs</div>
          </div>
        </div>
      </div>
      {/* Warning notice in --warn-100 with a --warn-border left edge */}
      <div className="p-3 bg-[#FFF1D6] rounded-inner border-l-4 border-[#B26A00] text-xs text-[#7A4A00]">
        <strong>Demo Help:</strong> For instant evaluation, use the demo credentials link on the login page (Institution: <code>INST102 / Pass@123</code>; Official: <code>official@aicte.gov.in / Admin@123</code>) and 2FA OTP: <code>123456</code>.
      </div>
    </div>
  </BaseModal>
);

export const ForgotPasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = React.useState(false);
  const [identifier, setIdentifier] = React.useState('');

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Reset Portal Password">
      {submitted ? (
        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 bg-[#EBF7EB] text-[#0E6A06] rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#143A6B]">Password Reset Instructions Dispatched</h4>
          <p className="text-xs text-[#4A6280] max-w-md mx-auto">
            A secure recovery link and temporary OTP have been dispatched to the registered email address for <strong>{identifier || 'your account'}</strong>.
          </p>
        </div>
      ) : (
        <form
          onSubmit={e => {
            e.preventDefault();
            setSubmitted(true);
          }}
          className="space-y-4"
        >
          <p className="text-xs text-[#4A6280]">
            Enter your registered Institution ID or Official AICTE Email ID to receive a secure password reset link.
          </p>
          <div>
            <label className="block text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px] mb-1.5">
              Institution ID or Official Email
            </label>
            <input
              type="text"
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. INST102 or official@aicte.gov.in"
              className="w-full px-3.5 py-2.5 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[40px] px-4 py-2 border border-[#DCE6F2] text-[#17324F] rounded-inner text-xs font-semibold hover:bg-[#F3F7FC] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-5 py-2 bg-[#1D6BB5] text-white rounded-inner text-xs font-semibold hover:bg-[#143A6B] cursor-pointer shadow-soft"
            >
              Send Reset Link
            </button>
          </div>
        </form>
      )}
    </BaseModal>
  );
};
