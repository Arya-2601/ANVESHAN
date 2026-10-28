import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Lock, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  GraduationCap, 
  Lightbulb, 
  BarChart3, 
  User,
  KeyRound 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { generateCaptchaText } from '../utils/formatters';
import { 
  TermsOfServiceModal, 
  PrivacyPolicyModal, 
  TermsAndComplianceModal, 
  HelpModal, 
  ForgotPasswordModal 
} from '../components/common/InfoModals';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, verify2FA } = useApp();

  const [activeTab, setActiveTab] = useState<'institution' | 'official'>('institution');
  const [identifier, setIdentifier] = useState('INST102');
  const [password, setPassword] = useState('Pass@123');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaCode, setCaptchaCode] = useState('K7B9X');
  const [isLoading, setIsLoading] = useState(false);

  // 2FA state
  const [step2FA, setStep2FA] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);

  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);

  useEffect(() => {
    refreshCaptcha();
  }, [activeTab]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step2FA && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step2FA, resendTimer]);

  const refreshCaptcha = () => {
    setCaptchaCode(generateCaptchaText());
    setCaptchaInput('');
  };

  const handleTabChange = (tab: 'institution' | 'official') => {
    setActiveTab(tab);
    if (tab === 'institution') {
      setIdentifier('INST102');
      setPassword('Pass@123');
    } else {
      setIdentifier('official@aicte.gov.in');
      setPassword('Admin@123');
    }
  };

  const autofillDemo = () => {
    if (activeTab === 'institution') {
      setIdentifier('INST102');
      setPassword('Pass@123');
    } else {
      setIdentifier('official@aicte.gov.in');
      setPassword('Admin@123');
    }
    setCaptchaInput(captchaCode);
    toast.success('Demo credentials and captcha filled!');
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!identifier.trim()) {
      toast.error(`Please provide your ${activeTab === 'institution' ? 'Institution ID' : 'Official Email ID'}`);
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (captchaInput.toUpperCase().trim() !== captchaCode.toUpperCase().trim()) {
      toast.error('Invalid Captcha code. Please try again.');
      refreshCaptcha();
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Trigger 2FA Step
      login(activeTab);
      setStep2FA(true);
      setResendTimer(60);
      toast.success('Credentials verified. Please enter the 6-digit OTP dispatched to your registered phone/email.');
    }, 600);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      val = val.slice(-1);
    }
    const newOtp = [...otpValues];
    newOtp[index] = val;
    setOtpValues(newOtp);

    // Auto-advance cursor
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handle2FASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredOtp = otpValues.join('');
    if (enteredOtp.length < 6) {
      toast.error('Please enter all 6 digits of the OTP');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const ok = verify2FA(enteredOtp);
      if (ok) {
        toast.success(`Welcome to ANVESHAN ${activeTab === 'official' ? 'Official Console' : 'Institution Portal'}`);
        navigate(activeTab === 'official' ? '/official/dashboard' : '/institution/dashboard');
      } else {
        toast.error('Invalid OTP. Use demo OTP: 123456');
      }
    }, 700);
  };

  const autofillOtp = () => {
    setOtpValues(['1', '2', '3', '4', '5', '6']);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC]">
      {/* 2. TOP ANNOUNCEMENT BAR */}
      <aside aria-label="Regulatory announcement" className="w-full bg-[#12355B] text-white py-2 px-4 sm:px-6 min-h-[40px] flex items-center z-20">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-[#F5A623] text-[#12355B] text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wide shrink-0">
              IMPORTANT
            </span>
            <span className="font-medium text-white/95 leading-normal">
              AICTE Regulation 2026: Mandatory electronic verification of joint Lien FDRs for academic approval continuity is active.
            </span>
          </div>
          <button 
            type="button"
            onClick={() => setActiveModal('compliance')} 
            className="text-white hover:text-[#EAF2FB] underline cursor-pointer shrink-0 font-medium text-left self-start sm:self-auto"
          >
            View Regulation Order
          </button>
        </div>
      </aside>

      {/* 1. OVERALL SPLIT MAIN AREA */}
      <main className="flex-1 flex flex-col lg:flex-row w-full">
        
        {/* 3. LEFT BRANDING PANEL (About 50%, light blue gradient #EAF2FB to #F7FAFD) */}
        <div className="w-full lg:w-1/2 relative bg-gradient-to-br from-[#EAF2FB] to-[#F7FAFD] flex flex-col justify-between p-6 sm:p-10 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#DCE6F2] overflow-hidden">
          
          {/* Faint education background line icons (hidden on small screens) */}
          <div aria-hidden="true" className="hidden lg:block absolute inset-0 pointer-events-none opacity-[0.045] select-none overflow-hidden">
            <div className="absolute top-12 left-12"><GraduationCap className="w-28 h-28 text-[#12355B]" /></div>
            <div className="absolute top-20 right-16"><BookOpen className="w-32 h-32 text-[#12355B]" /></div>
            <div className="absolute bottom-36 left-16"><Lightbulb className="w-32 h-32 text-[#12355B]" /></div>
            <div className="absolute bottom-16 right-20"><BarChart3 className="w-28 h-28 text-[#12355B]" /></div>
            <div className="absolute top-1/2 right-1/3"><User className="w-24 h-24 text-[#12355B]" /></div>
          </div>

          {/* Top Pill Chip */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-[#DCE6F2] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#138808]"></span>
              <span className="text-xs font-semibold text-[#12355B]">AICTE Statutory Security Deposit Management</span>
            </div>
          </div>

          {/* Center Content Stack: Brand Row + Feature Cards */}
          <div className="relative z-10 my-auto py-8 sm:py-10 space-y-8 max-w-xl">
            
            {/* Brand Row: Logo (120px) | Text Block */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <img 
                src="/assets/aicte-logo.png" 
                alt="AICTE Logo" 
                className="w-24 h-24 sm:w-[120px] sm:h-[120px] object-contain shrink-0 filter drop-shadow-xs"
              />
              <div className="hidden sm:block w-px bg-[#DCE6F2] self-stretch my-1"></div>
              <div>
                <h1 className="text-2xl sm:text-[28px] font-bold text-[#12355B] tracking-tight leading-tight">
                  All India Council for Technical Education
                </h1>
                <p className="text-base sm:text-[20px] text-[#4A6280] font-normal mt-1 leading-snug">
                  Ministry of Education, Govt. of India
                </p>
                <div className="mt-3">
                  <span className="text-3xl sm:text-[44px] font-extrabold text-[#1F6FB5] tracking-tight leading-none block">
                    ANVESHAN
                  </span>
                  <span className="text-base sm:text-[22px] text-[#12355B] font-medium leading-snug block mt-1">
                    Transparency through Verification
                  </span>
                </div>
              </div>
            </div>

            {/* Two Feature Cards side by side (stack below 600px) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 sm:p-5 bg-white rounded-[8px] border border-[#DCE6F2] shadow-soft flex flex-col justify-center">
                <h3 className="text-xs sm:text-sm font-bold text-[#12355B] mb-1.5">
                  Automated Bank Verification
                </h3>
                <p className="text-xs text-[#4A6280] leading-relaxed">
                  Dual-column comparison between college deposit claims and core banking API confirmation.
                </p>
              </div>

              <div className="p-4 sm:p-5 bg-white rounded-[8px] border border-[#DCE6F2] shadow-soft flex flex-col justify-center">
                <h3 className="text-xs sm:text-sm font-bold text-[#12355B] mb-1.5">
                  Tamper-Proof Audit Trail
                </h3>
                <p className="text-xs text-[#4A6280] leading-relaxed">
                  Immutable regulatory logs for every submission, scrutiny flag, renewal, and release.
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice Pinned Near Bottom */}
          <div className="relative z-10 text-xs text-[#4A6280] leading-relaxed pt-4 border-t border-[#DCE6F2]/40 lg:border-t-0">
            For security, do not share your login credentials or OTP with anyone. AICTE officials will never solicit passwords.
          </div>
        </div>

        {/* 4. RIGHT LOGIN PANEL (About 50%, near-white background #F7F9FC) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-[#F7F9FC]">
          
          {/* Centered Floating Card (max-width 460px, rounded 12px, soft shadow) */}
          <div className="w-full max-w-[460px] bg-white rounded-[12px] shadow-[0_8px_30px_rgba(18,53,91,0.08)] border border-[#DCE6F2] overflow-hidden my-auto animate-fadeIn">
            
            {/* Header Block */}
            <div className="pt-6 pb-4 px-6 sm:px-8 text-center border-b border-[#DCE6F2] bg-white">
              <h2 className="text-[22px] font-bold text-[#12355B] tracking-tight leading-snug">
                Authorized Portal Access
              </h2>
              <p className="text-xs text-[#4A6280] mt-1">
                Enter your authorized credentials to access regulatory tools
              </p>
            </div>

            {!step2FA ? (
              <>
                {/* Tabs: Institution Login / AICTE Official Login */}
                <div className="grid grid-cols-2 border-b border-[#DCE6F2]" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'institution'}
                    onClick={() => handleTabChange('institution')}
                    className={`py-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
                      activeTab === 'institution'
                        ? 'bg-white text-[#1F6FB5] border-b-2 border-[#1F6FB5]'
                        : 'bg-[#EAF2FB] text-[#4A6280] hover:text-[#12355B] border-b-2 border-transparent'
                    }`}
                  >
                    Institution Login
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'official'}
                    onClick={() => handleTabChange('official')}
                    className={`py-3 text-xs sm:text-sm font-semibold transition-all cursor-pointer text-center ${
                      activeTab === 'official'
                        ? 'bg-white text-[#1F6FB5] border-b-2 border-[#1F6FB5]'
                        : 'bg-[#EAF2FB] text-[#4A6280] hover:text-[#12355B] border-b-2 border-transparent'
                    }`}
                  >
                    AICTE Official Login
                  </button>
                </div>

                {/* Form Fields */}
                <form onSubmit={handleInitialSubmit} className="p-6 sm:p-8 space-y-4">
                  {/* Field 1: Institution ID / Official Email ID */}
                  <div>
                    <label 
                      htmlFor="login-identifier" 
                      className="block text-[11px] font-bold text-[#4A6280] uppercase tracking-[0.8px] mb-1.5"
                    >
                      {activeTab === 'institution' ? 'INSTITUTION ID / PERMANENT ID' : 'OFFICIAL EMAIL ID / SSO'}
                    </label>
                    <input
                      id="login-identifier"
                      type="text"
                      required
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder={activeTab === 'institution' ? 'e.g. INST102' : 'official@aicte.gov.in'}
                      className="w-full h-[44px] px-3.5 text-xs sm:text-sm text-[#17324F] bg-[#EEF4FB] focus:bg-white border border-[#DCE6F2] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#1F6FB5] focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Field 2: Password + Forgot Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label 
                        htmlFor="login-password" 
                        className="block text-[11px] font-bold text-[#4A6280] uppercase tracking-[0.8px]"
                      >
                        PASSWORD
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveModal('forgot-pass')}
                        className="text-xs text-[#1F6FB5] hover:underline cursor-pointer font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-[44px] px-3.5 pr-11 text-xs sm:text-sm text-[#17324F] bg-[#EEF4FB] focus:bg-white border border-[#DCE6F2] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#1F6FB5] focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-3 p-1 text-[#4A6280] hover:text-[#12355B] cursor-pointer transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Field 3: Captcha */}
                  <div>
                    <label 
                      htmlFor="login-captcha" 
                      className="block text-[11px] font-bold text-[#4A6280] uppercase tracking-[0.8px] mb-1.5"
                    >
                      SECURITY VERIFICATION (CAPTCHA)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        id="login-captcha"
                        type="text"
                        required
                        value={captchaInput}
                        onChange={e => setCaptchaInput(e.target.value)}
                        placeholder="ENTER CODE"
                        maxLength={5}
                        className="flex-1 h-[44px] px-3.5 text-xs sm:text-sm text-[#17324F] uppercase font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:normal-case bg-[#EEF4FB] focus:bg-white border border-[#DCE6F2] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#1F6FB5] focus:border-transparent transition-all"
                      />
                      {/* Stylized distorted light-blue Captcha tile */}
                      <div 
                        aria-label={`Captcha code: ${captchaCode}`}
                        className="h-[44px] px-3.5 bg-[#E3EEFB] border border-[#DCE6F2] rounded-[8px] flex items-center justify-center font-mono tracking-[0.22em] text-base sm:text-lg font-black text-[#12355B] select-none relative overflow-hidden shadow-xs min-w-[90px]"
                      >
                        <span className="italic transform -rotate-2 scale-105 tracking-widest select-none">
                          {captchaCode}
                        </span>
                        <div className="absolute inset-0 pointer-events-none opacity-25 bg-[linear-gradient(45deg,transparent_45%,#1F6FB5_50%,transparent_55%)]"></div>
                      </div>
                      {/* Square refresh icon button */}
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        title="Refresh Captcha"
                        aria-label="Refresh Captcha"
                        className="h-[44px] w-[44px] shrink-0 flex items-center justify-center bg-white hover:bg-[#EEF4FB] border border-[#DCE6F2] rounded-[8px] text-[#4A6280] hover:text-[#1F6FB5] transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Primary Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[44px] mt-2 bg-[#1F6FB5] hover:bg-[#12355B] text-white font-semibold rounded-[8px] text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Secure Sign In</span>
                      </>
                    )}
                  </button>

                  {/* Demo Helper */}
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={autofillDemo}
                      className="text-xs text-[#1F6FB5] hover:underline inline-flex items-center gap-1.5 font-semibold cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#F5A623]" />
                      <span>Autofill demo credentials ({activeTab === 'institution' ? 'INST102' : 'official@aicte.gov.in'})</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* Step 2: 2FA OTP Screen */
              <form onSubmit={handle2FASubmit} className="p-6 sm:p-8 space-y-5 animate-fadeIn">
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 bg-[#E3EEFB] text-[#1F6FB5] rounded-full flex items-center justify-center mx-auto mb-2 border border-[#DCE6F2]">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#12355B]">Two-Factor Authentication (2FA)</h3>
                  <p className="text-xs text-[#4A6280]">
                    Enter the 6-digit verification code sent to your registered AICTE mobile number & email.
                  </p>
                </div>

                {/* 6-digit OTP Inputs */}
                <div className="flex justify-between gap-2 max-w-xs mx-auto py-2">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={val}
                      onChange={e => handleOtpChange(idx, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(idx, e)}
                      aria-label={`Digit ${idx + 1} of 6`}
                      className="w-10 h-12 text-center font-bold text-lg border border-[#DCE6F2] rounded-[8px] bg-[#EEF4FB] focus:bg-white focus:border-[#1F6FB5] focus:ring-2 focus:ring-[#1F6FB5]/20 focus:outline-none text-[#12355B]"
                    />
                  ))}
                </div>

                <div className="text-center text-xs text-[#4A6280]">
                  {resendTimer > 0 ? (
                    <span>Resend OTP in <strong>{resendTimer}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setResendTimer(60)}
                      className="text-[#1F6FB5] hover:underline cursor-pointer font-semibold"
                    >
                      Resend OTP Code
                    </button>
                  )}
                </div>

                {/* Helper hint */}
                <div className="p-2.5 bg-[#FFF1D6] border-l-4 border-[#B26A00] rounded-[8px] text-center text-xs text-[#7A4A00]">
                  <span>Demo OTP hint: </span>
                  <button
                    type="button"
                    onClick={autofillOtp}
                    className="font-bold underline cursor-pointer text-[#7A4A00]"
                  >
                    Click to fill 123456
                  </button>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[44px] bg-[#1F6FB5] hover:bg-[#12355B] text-white font-semibold rounded-[8px] text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Complete Sign In</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep2FA(false)}
                    className="w-full py-2 text-xs text-[#4A6280] hover:text-[#12355B] cursor-pointer font-medium"
                  >
                    ← Back to credential login
                  </button>
                </div>
              </form>
            )}

            {/* Card Footer Strip */}
            <div className="bg-[#F1F5F9] px-6 py-3 border-t border-[#DCE6F2] text-[11px] text-[#4A6280] flex items-center justify-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-[#4A6280]" />
              <span>TLS 1.3 Certified Encrypted Session</span>
            </div>
          </div>
        </div>

      </main>

      {/* Modals */}
      <TermsOfServiceModal isOpen={activeModal === 'tos'} onClose={() => setActiveModal(null)} />
      <PrivacyPolicyModal isOpen={activeModal === 'privacy'} onClose={() => setActiveModal(null)} />
      <TermsAndComplianceModal isOpen={activeModal === 'compliance'} onClose={() => setActiveModal(null)} />
      <HelpModal isOpen={activeModal === 'help'} onClose={() => setActiveModal(null)} />
      <ForgotPasswordModal isOpen={activeModal === 'forgot-pass'} onClose={() => setActiveModal(null)} />
    </div>
  );
};

