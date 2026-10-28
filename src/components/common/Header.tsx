import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { 
  Bell, 
  LogOut, 
  Shield, 
  Lock, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  ChevronDown,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';
import { TermsAndComplianceModal } from './InfoModals';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    role, 
    logout, 
    notifications, 
    markNotificationRead, 
    clearAllNotifications,
    maskFdrNumberState,
    setMaskFdrNumberState,
    login,
    resetAllData
  } = useApp();

  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showComplianceModal, setShowComplianceModal] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.readAt).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Signed out securely');
    navigate('/login');
  };

  const handleRoleSwitch = (newRole: 'institution' | 'official') => {
    login(newRole);
    toast.success(`Switched role to ${newRole === 'official' ? 'AICTE Official' : 'Institution'}`);
    setShowProfileMenu(false);
    navigate(newRole === 'official' ? '/official/dashboard' : '/institution/dashboard');
  };

  const handleReset = async () => {
    await resetAllData();
    toast.success('All mock records reset to factory defaults');
    setShowProfileMenu(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-[#DCE6F2] shadow-soft">
        {/* Full-width navy banner (--navy-900, white 14px semibold) */}
        <div className="bg-[#143A6B] text-white text-sm font-semibold px-4 sm:px-6 py-2 border-b border-[#143A6B]/80">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 truncate">
              <span className="bg-[#F5A623] text-[#143A6B] text-xs font-extrabold uppercase px-2 py-0.5 rounded-full tracking-wide shrink-0">
                IMPORTANT
              </span>
              <span className="truncate text-xs sm:text-sm">
                AICTE Regulation 2026: Mandatory electronic verification of Joint Lien FDRs for academic approval continuity is active.
              </span>
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <button
                onClick={() => setShowComplianceModal(true)}
                className="text-white hover:text-[#E3EEFB] underline text-xs sm:text-sm font-medium cursor-pointer"
              >
                View Regulation Order
              </button>
              <div className="hidden lg:flex items-center gap-3 border-l border-white/20 pl-3">
                <button 
                  onClick={() => {
                    setMaskFdrNumberState(!maskFdrNumberState);
                    toast(maskFdrNumberState ? 'FDR masking disabled' : 'FDR numbers masked for privacy', {
                      icon: maskFdrNumberState ? '🔓' : '🔒',
                    });
                  }}
                  className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Toggle mask on sensitive account numbers"
                >
                  {maskFdrNumberState ? <EyeOff className="w-3.5 h-3.5 text-[#F5A623]" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{maskFdrNumberState ? 'Masked: ON' : 'Mask FDRs'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Header Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Left: AICTE emblem 52px + ANVESHAN in bold --blue-600 24px */}
          <Link 
            to={role === 'official' ? '/official/dashboard' : '/institution/dashboard'} 
            className="flex items-center space-x-3.5 group focus:outline-none"
          >
            <img 
              src="/assets/aicte-logo.png" 
              alt="AICTE Logo" 
              className="h-[52px] w-[52px] object-contain shrink-0 filter group-hover:brightness-105 transition-all"
            />
            <div className="border-l border-[#DCE6F2] pl-3.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#1D6BB5] tracking-tight">ANVESHAN</span>
                <span className="text-xs sm:text-sm text-[#4A6280] font-normal hidden sm:inline">
                  | Transparency through Verification
                </span>
              </div>
              <div className="text-xs text-[#4A6280] font-medium leading-tight mt-0.5">
                All India Council for Technical Education · Ministry of Education, Govt. of India
              </div>
            </div>
          </Link>

          {/* Right Side: Role Pill, Bell with count, User Menu */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            
            {/* Role Pill (blue outline on --blue-50) */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F3F7FC] text-[#1D6BB5] border border-[#1D6BB5]">
              {role === 'official' ? (
                <>
                  <Shield className="w-3.5 h-3.5 text-[#1D6BB5]" />
                  <span>AICTE Official View</span>
                </>
              ) : (
                <>
                  <Building className="w-3.5 h-3.5 text-[#1D6BB5]" />
                  <span>Institution View</span>
                </>
              )}
            </div>

            {/* Notifications Dropdown (Section 1) */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-[#4A6280] hover:text-[#143A6B] hover:bg-[#F3F7FC] rounded-full transition-colors cursor-pointer border border-transparent hover:border-[#DCE6F2]"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-[#B3261E] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-card shadow-float border border-[#DCE6F2] py-2 z-50 animate-scaleUp">
                  <div className="px-4 py-2.5 border-b border-[#DCE6F2] flex items-center justify-between bg-[#F3F7FC]">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs uppercase tracking-[0.8px] text-[#143A6B]">Notifications & Alerts</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-[#B3261E] text-white font-bold px-1.5 py-0.2 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await clearAllNotifications();
                          toast.success('All notifications marked as read');
                        }}
                        className="text-xs text-[#1D6BB5] hover:underline cursor-pointer font-semibold"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#DCE6F2]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-[#4A6280]">
                        No active notifications
                      </div>
                    ) : (
                      notifications.map(item => {
                        const isUnread = !item.readAt;
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              markNotificationRead(item.id);
                              if (item.link) {
                                navigate(item.link);
                                setShowNotifications(false);
                              }
                            }}
                            className={`p-3 text-xs hover:bg-[#F3F7FC] cursor-pointer transition-colors ${
                              isUnread ? 'bg-[#E3EEFB]/50 border-l-2 border-l-[#1D6BB5]' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-semibold ${
                                item.type === 'alert' ? 'text-[#9F1D14]' :
                                item.type === 'warning' ? 'text-[#7A4A00]' : 'text-[#1D6BB5]'
                              }`}>
                                {item.title}
                              </span>
                              <span className="text-[10px] text-[#4A6280]">
                                {new Date(item.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                            <p className="text-[#17324F] leading-snug">{item.message}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Menu */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2.5 p-1.5 rounded-inner hover:bg-[#F3F7FC] transition-colors cursor-pointer border border-transparent hover:border-[#DCE6F2]"
              >
                <div className="w-8 h-8 rounded-full bg-[#143A6B] text-white flex items-center justify-center font-bold text-xs shadow-soft">
                  {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-[#143A6B] leading-tight truncate max-w-[130px]">
                    {currentUser?.name || 'Authorized User'}
                  </div>
                  <div className="text-[11px] text-[#4A6280] truncate max-w-[130px]">
                    {currentUser?.role === 'official' ? 'Official Bureau' : currentUser?.institutionId || 'College User'}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#4A6280]" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-card shadow-float border border-[#DCE6F2] py-2 z-50 animate-scaleUp">
                  <div className="px-4 py-3 border-b border-[#DCE6F2] bg-[#F3F7FC]">
                    <div className="text-xs font-bold text-[#143A6B]">{currentUser?.name}</div>
                    <div className="text-[11px] text-[#4A6280]">{currentUser?.email}</div>
                    <div className="text-[11px] text-[#1D6BB5] mt-1 font-semibold">
                      {currentUser?.department || currentUser?.institutionName}
                    </div>
                  </div>

                  {/* Role Switcher Demo Control */}
                  <div className="px-4 py-2.5 border-b border-[#DCE6F2]">
                    <div className="text-[11px] font-bold text-[#4A6280] uppercase tracking-[0.8px] mb-2">
                      Quick Role Switch (Demo)
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleRoleSwitch('institution')}
                        className={`h-9 px-2 text-xs rounded-inner font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          role === 'institution'
                            ? 'bg-[#1D6BB5] text-white'
                            : 'bg-[#F3F7FC] text-[#17324F] hover:bg-[#E3EEFB] border border-[#DCE6F2]'
                        }`}
                      >
                        <Building className="w-3.5 h-3.5" />
                        Institution
                      </button>
                      <button
                        onClick={() => handleRoleSwitch('official')}
                        className={`h-9 px-2 text-xs rounded-inner font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                          role === 'official'
                            ? 'bg-[#143A6B] text-white'
                            : 'bg-[#F3F7FC] text-[#17324F] hover:bg-[#E3EEFB] border border-[#DCE6F2]'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Official
                      </button>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={handleReset}
                      className="w-full text-left px-4 py-2 text-xs text-[#17324F] hover:bg-[#F3F7FC] flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <RotateCcw className="w-4 h-4 text-[#4A6280]" />
                      <span>Reset Demo Data</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs text-[#B3261E] hover:bg-[#FDECEA] flex items-center gap-2 cursor-pointer font-semibold"
                    >
                      <LogOut className="w-4 h-4 text-[#B3261E]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Regulation Order Modal */}
      <TermsAndComplianceModal 
        isOpen={showComplianceModal} 
        onClose={() => setShowComplianceModal(false)} 
      />
    </>
  );
};
