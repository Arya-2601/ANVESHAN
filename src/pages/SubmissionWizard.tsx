import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { MAJOR_BANKS } from '../data/mockData';
import { formatINR, isValidIFSC } from '../utils/formatters';
import { 
  Building2, 
  FileUp, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight, 
  UploadCloud, 
  FileText, 
  Trash2, 
  AlertCircle,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';

export const SubmissionWizard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, addFDR } = useApp();

  const prefill = location.state?.prefillFDR;

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State - Step 1: Instrument Details
  const [bankName, setBankName] = useState(prefill?.bankName || MAJOR_BANKS[0]);
  const [branchIfsc, setBranchIfsc] = useState(prefill?.branchIfsc || '');
  const [fdrNumber, setFdrNumber] = useState(prefill ? `${prefill.fdrNumber}-R` : '');
  const [principalAmount, setPrincipalAmount] = useState<number | ''>(prefill?.principalAmount || '');
  const [issueDate, setIssueDate] = useState(prefill ? new Date().toISOString().split('T')[0] : '');
  const [maturityDate, setMaturityDate] = useState('');

  // Form State - Step 2: Document Upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Form State - Step 3: Consent
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};

    if (!bankName) errs.bankName = 'Please select an issuing bank';
    if (!branchIfsc || !isValidIFSC(branchIfsc)) {
      errs.branchIfsc = 'Enter valid 11-digit IFSC (e.g. SBIN0001234)';
    }
    if (!fdrNumber.trim()) errs.fdrNumber = 'FDR Account Number is required';
    if (!principalAmount || Number(principalAmount) < 50000) {
      errs.principalAmount = 'Principal must be at least ₹ 50,000';
    }
    if (!issueDate) errs.issueDate = 'Issue date is required';
    if (!maturityDate) {
      errs.maturityDate = 'Maturity date is required';
    } else if (issueDate && new Date(maturityDate) <= new Date(issueDate)) {
      errs.maturityDate = 'Maturity date must be after Issue date';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setStep(2);
    } else {
      toast.error('Please resolve the errors highlighted below.');
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    setFileError('');
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validExtensions.includes(ext) && !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type)) {
      setFileError('Invalid file format. Only PDF, PNG, and JPG documents are accepted.');
      toast.error('Only PDF, PNG, and JPG documents are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size exceeds maximum permitted limit of 5 MB.');
      toast.error('File size exceeds maximum limit of 5 MB');
      return;
    }

    setSelectedFile(file);
    setIsUploading(true);
    setUploadProgress(10);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          toast.success('FDR receipt uploaded and verified');
          return 100;
        }
        return prev + 30;
      });
    }, 150);
  };

  const handleNextFromStep2 = () => {
    if (!selectedFile) {
      setFileError('Upload the scanned bank FDR receipt (PDF/PNG/JPG) to continue');
      toast.error('Upload the scanned bank FDR receipt (PDF/PNG/JPG) to continue');
      return;
    }
    setFileError('');
    setStep(3);
  };

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Scanned bank FDR receipt is required');
      setStep(2);
      setFileError('Upload the scanned bank FDR receipt (PDF/PNG/JPG) to continue');
      return;
    }
    if (!consentGiven) {
      toast.error('Mandatory authorization consent is required');
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('fdrNumber', fdrNumber.trim());
      formData.append('institutionId', currentUser?.institutionId || 'INST102');
      formData.append('institutionName', currentUser?.institutionName || 'Veermata Jijabai Technological Institute (VJTI)');
      formData.append('state', 'Maharashtra');
      formData.append('bankName', bankName);
      formData.append('branchIfsc', branchIfsc.toUpperCase().trim());
      formData.append('principalAmount', String(principalAmount));
      formData.append('issueDate', issueDate);
      formData.append('maturityDate', maturityDate);
      formData.append('verificationConsent', 'true');
      if (prefill?.id) {
        formData.append('previousFdrId', prefill.id);
      }

      await addFDR(formData);
      toast.success('FDR submitted successfully! Queued for AICTE Scrutiny.');
      navigate('/institution/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit FDR');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back button & Title */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate('/institution/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#4A6280] hover:text-[#143A6B] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>
        <span className="text-xs bg-[#E3EEFB] text-[#1D6BB5] px-3 py-1 rounded-full font-bold border border-[#DCE6F2]">
          {prefill ? 'Renewal / Replacement Mode' : 'New Security Deposit'}
        </span>
      </div>

      <div className="bg-white rounded-[12px] shadow-[0_1px_3px_rgba(20,58,107,0.08)] border border-[#DCE6F2] overflow-hidden">
        
        {/* Wizard Header & Stepper */}
        <div className="bg-[#143A6B] text-white p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {prefill ? 'Submit Renewed / Replacement FDR' : 'Submit New Fixed Deposit Receipt (FDR)'}
          </h1>
          <p className="text-xs sm:text-sm text-[#E3EEFB] mt-1">
            Regulation Bureau AICTE • Complete all three verification steps
          </p>

          {/* Stepper Progress Bar */}
          <div className="mt-8 flex items-center justify-between max-w-xl mx-auto">
            {/* Step 1 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step >= 1 ? 'bg-[#1D6BB5] text-white ring-4 ring-[#E3EEFB]/40' : 'bg-[#17324F] text-[#DCE6F2] border border-[#DCE6F2]/30'
              }`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="text-[11px] font-medium mt-1.5 text-center text-[#E3EEFB]">
                Instrument Details
              </span>
            </div>

            <div className={`h-0.5 flex-1 transition-colors ${step >= 2 ? 'bg-[#1D6BB5]' : 'bg-[#DCE6F2]/30'}`}></div>

            {/* Step 2 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step >= 2 ? 'bg-[#1D6BB5] text-white ring-4 ring-[#E3EEFB]/40' : 'bg-[#17324F] text-[#DCE6F2] border border-[#DCE6F2]/30'
              }`}>
                {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-[11px] font-medium mt-1.5 text-center text-[#E3EEFB]">
                Document Upload
              </span>
            </div>

            <div className={`h-0.5 flex-1 transition-colors ${step >= 3 ? 'bg-[#1D6BB5]' : 'bg-[#DCE6F2]/30'}`}></div>

            {/* Step 3 */}
            <div className="flex flex-col items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                step === 3 ? 'bg-[#1D6BB5] text-white ring-4 ring-[#E3EEFB]/40' : 'bg-[#17324F] text-[#DCE6F2] border border-[#DCE6F2]/30'
              }`}>
                3
              </div>
              <span className="text-[11px] font-medium mt-1.5 text-center text-[#E3EEFB]">
                Consent & Review
              </span>
            </div>
          </div>
        </div>

        {/* Wizard Body */}
        <div className="p-6 sm:p-8">
          
          {/* STEP 1: Instrument Details */}
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-[#DCE6F2] pb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#143A6B] flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-[#1D6BB5]" />
                    <span>Step 1: Fixed Deposit Instrument Particulars</span>
                  </h2>
                  <p className="text-xs text-[#4A6280] mt-0.5">
                    Enter exact information as printed on the bank fixed deposit receipt.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBankName('State Bank of India');
                    setBranchIfsc('SBIN0001107');
                    setFdrNumber('FDR-2026-9921');
                    setPrincipalAmount(3500000);
                    setIssueDate('2026-09-15');
                    setMaturityDate('2029-09-15');
                    toast.success('Sample FDR particulars filled');
                  }}
                  className="px-3 py-1.5 bg-[#F3F7FC] border border-[#DCE6F2] text-[#1D6BB5] hover:bg-[#E3EEFB] rounded-[8px] text-xs font-semibold cursor-pointer transition-colors"
                >
                  ⚡ Autofill Sample Data
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bank Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    Issuing Scheduled Bank <span className="text-[#B3261E]">*</span>
                  </label>
                  <select
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  >
                    {MAJOR_BANKS.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {errors.bankName && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.bankName}</p>}
                </div>

                {/* Branch IFSC */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    Branch IFSC Code <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={branchIfsc}
                    onChange={e => setBranchIfsc(e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001107"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm uppercase font-mono font-medium border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  />
                  {errors.branchIfsc && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.branchIfsc}</p>}
                  <span className="text-[10px] text-[#4A6280] block mt-1">11 alphanumeric characters</span>
                </div>

                {/* FDR Number */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    FDR Account / Certificate Number <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="text"
                    value={fdrNumber}
                    onChange={e => setFdrNumber(e.target.value)}
                    placeholder="e.g. FDR-2026-9921"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-mono font-medium border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  />
                  {errors.fdrNumber && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.fdrNumber}</p>}
                </div>

                {/* Principal Amount */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    Principal Deposit Amount (₹) <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="number"
                    value={principalAmount}
                    onChange={e => setPrincipalAmount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="e.g. 3500000"
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  />
                  {errors.principalAmount && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.principalAmount}</p>}
                  {principalAmount ? (
                    <span className="text-[11px] font-semibold text-[#1D6BB5] mt-1 block">
                      Amount in Words: {formatINR(Number(principalAmount))}
                    </span>
                  ) : null}
                </div>

                {/* Issue Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    Date of Issue <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="date"
                    value={issueDate}
                    onChange={e => setIssueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  />
                  {errors.issueDate && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.issueDate}</p>}
                </div>

                {/* Maturity Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-[0.8px] text-[#143A6B] mb-1.5">
                    Date of Maturity <span className="text-[#B3261E]">*</span>
                  </label>
                  <input
                    type="date"
                    value={maturityDate}
                    onChange={e => setMaturityDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#DCE6F2] rounded-[8px] bg-[#F8FAFD] focus:bg-white focus:ring-2 focus:ring-[#1D6BB5] min-h-[40px] text-[#17324F]"
                  />
                  {errors.maturityDate && <p className="text-xs text-[#B3261E] mt-1 font-medium">{errors.maturityDate}</p>}
                  <span className="text-[10px] text-[#4A6280] block mt-1">Maturity date must strictly exceed Date of Issue</span>
                </div>
              </div>

              {/* Navigation button */}
              <div className="pt-6 border-t border-[#DCE6F2] flex justify-end">
                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  className="min-h-[40px] px-6 py-2.5 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-[8px] text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Continue to Document Upload</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Document Upload */}
          {step === 2 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="border-b border-[#DCE6F2] pb-3">
                <h2 className="text-base font-bold text-[#143A6B] flex items-center gap-2">
                  <FileUp className="w-5 h-5 text-[#1D6BB5]" />
                  <span>Step 2: Upload Scanned Bank FDR Receipt</span>
                </h2>
                <p className="text-xs text-[#4A6280] mt-0.5">
                  Upload a clear digital scan of the joint fixed deposit receipt with AICTE lien marking clause visible.
                </p>
              </div>

              {/* Drag and Drop Zone */}
              <div
                aria-invalid={!!fileError}
                onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-[12px] p-8 text-center transition-all ${
                  fileError 
                    ? 'border-[#B3261E] bg-[#FDECEA]/30' 
                    : dragActive 
                    ? 'border-[#1D6BB5] bg-[#E3EEFB]/40' 
                    : 'border-[#DCE6F2] bg-[#F8FAFD]'
                }`}
              >
                <UploadCloud className={`w-12 h-12 mx-auto mb-3 ${fileError ? 'text-[#B3261E]' : 'text-[#1D6BB5]'}`} />
                <h3 className="text-sm font-bold text-[#17324F]">
                  Upload Scanned Bank FDR Receipt <span className="text-[#B3261E]">*</span>
                </h3>
                <p className="text-xs text-[#4A6280] mt-1">
                  Supported formats: <strong>PDF, PNG, JPG</strong> (Max file size: 5 MB)
                </p>

                <div className="mt-4 flex items-center justify-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#DCE6F2] text-xs font-semibold text-[#17324F] rounded-[8px] shadow-xs hover:bg-[#F3F7FC] cursor-pointer min-h-[38px] transition-colors">
                    <span>{selectedFile ? 'Replace File' : 'Browse Computer Files'}</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                      onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>

                {fileError && (
                  <p className="text-xs text-[#B3261E] mt-3 font-semibold flex items-center justify-center gap-1.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fileError}</span>
                  </p>
                )}
              </div>

              {/* File Preview Card & Progress */}
              {isUploading && (
                <div className="p-4 bg-[#E3EEFB] border border-[#DCE6F2] rounded-[8px]">
                  <div className="flex justify-between text-xs font-semibold text-[#17324F] mb-1">
                    <span>Uploading {selectedFile?.name}...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#DCE6F2] rounded-full h-2">
                    <div
                      className="bg-[#1D6BB5] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {selectedFile && !isUploading && (
                <div className="p-4 bg-[#E3EEFB]/30 border border-[#0E6A06]/30 rounded-[8px] flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-8 h-8 text-[#0E6A06] shrink-0" />
                    <div>
                      <div className="text-sm font-bold text-[#17324F]">{selectedFile.name}</div>
                      <div className="text-xs text-[#4A6280]">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Scanned bank receipt attached
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-[#1D6BB5] hover:underline font-semibold cursor-pointer">
                      <span>Replace</span>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                        onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFileError('Upload the scanned bank FDR receipt (PDF/PNG/JPG) to continue');
                      }}
                      className="p-1.5 text-[#B3261E] hover:bg-[#FDECEA] rounded-[8px] cursor-pointer transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 Nav */}
              <div className="pt-6 border-t border-[#DCE6F2] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="min-h-[40px] px-5 py-2.5 border border-[#DCE6F2] text-[#4A6280] font-semibold rounded-[8px] text-xs sm:text-sm hover:bg-[#F3F7FC] cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Details</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextFromStep2}
                  className="min-h-[40px] px-6 py-2.5 bg-[#1D6BB5] hover:bg-[#143A6B] text-white font-semibold rounded-[8px] text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span>Continue to Review & Consent</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Verification Consent & Summary */}
          {step === 3 && (
            <form onSubmit={handleFinalSubmit} className="space-y-6 animate-fadeIn">
              <div className="border-b border-[#DCE6F2] pb-3">
                <h2 className="text-base font-bold text-[#143A6B] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#0E6A06]" />
                  <span>Step 3: Verification Consent & Submission Review</span>
                </h2>
                <p className="text-xs text-[#4A6280] mt-0.5">
                  Carefully verify all parameters before submitting to the AICTE Scrutiny Queue.
                </p>
              </div>

              {/* Review Summary Grid */}
              <div className="bg-[#F8FAFD] rounded-[8px] border border-[#DCE6F2] p-5">
                <h3 className="text-xs font-bold text-[#4A6280] uppercase tracking-[0.8px] mb-3">
                  Instrument Summary Review
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[#4A6280] block">Issuing Bank</span>
                    <span className="font-bold text-[#17324F]">{bankName}</span>
                  </div>
                  <div>
                    <span className="text-[#4A6280] block">Branch IFSC</span>
                    <span className="font-mono font-medium text-[#17324F]">{branchIfsc}</span>
                  </div>
                  <div>
                    <span className="text-[#4A6280] block">FDR Number</span>
                    <span className="font-mono font-medium text-[#143A6B]">{fdrNumber}</span>
                  </div>
                  <div>
                    <span className="text-[#4A6280] block">Principal Amount</span>
                    <span className="font-extrabold text-[#0E6A06] text-sm">{formatINR(Number(principalAmount))}</span>
                  </div>
                  <div>
                    <span className="text-[#4A6280] block">Date of Issue</span>
                    <span className="font-bold text-[#17324F]">{issueDate}</span>
                  </div>
                  <div>
                    <span className="text-[#4A6280] block">Date of Maturity</span>
                    <span className="font-bold text-[#17324F]">{maturityDate}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-[#DCE6F2] flex items-center justify-between text-xs">
                  <span className="text-[#4A6280] font-bold">Attached Scanned Receipt (Required):</span>
                  {selectedFile ? (
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#0E6A06]" />
                      <span className="font-bold text-[#143A6B]">
                        {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-[#B3261E] font-bold">Missing File!</span>
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="text-[#1D6BB5] underline font-semibold"
                      >
                        Upload in Step 2
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Mandatory Consent Box */}
              <div 
                onClick={() => setConsentGiven(!consentGiven)}
                className={`p-4 rounded-[8px] border transition-all cursor-pointer select-none ${
                  consentGiven ? 'bg-[#E3EEFB]/40 border-[#1D6BB5] ring-2 ring-[#E3EEFB]' : 'bg-[#F8FAFD] border-[#DCE6F2] hover:border-[#1D6BB5]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={consentGiven}
                    onChange={e => setConsentGiven(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-[#1D6BB5] border-[#DCE6F2] rounded focus:ring-[#1D6BB5] cursor-pointer"
                  />
                  <div className="text-xs text-[#17324F] leading-relaxed">
                    <span className="font-bold text-[#143A6B]">Mandatory Regulatory Authorization & Consent:</span>
                    <p className="mt-1">
                      On behalf of the College / Trust, I hereby authorize the All India Council for Technical Education (AICTE) to electronically cross-verify this Fixed Deposit Receipt directly with {bankName} core banking API and request lien confirmation. I affirm that this instrument is genuine and encumbrance-free.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3 Nav */}
              <div className="pt-6 border-t border-[#DCE6F2] flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="min-h-[40px] px-5 py-2.5 border border-[#DCE6F2] text-[#4A6280] font-semibold rounded-[8px] text-xs sm:text-sm hover:bg-[#F3F7FC] cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Document</span>
                </button>
                <button
                  type="submit"
                  disabled={!consentGiven || isSubmitting}
                  className="min-h-[40px] px-6 py-2.5 bg-[#0E6A06] hover:bg-[#138808] text-white font-semibold rounded-[8px] text-xs sm:text-sm transition-colors flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Submitting to Bureau...</span>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Submit Instrument for AICTE Scrutiny</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
