import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Clock, ShieldAlert, Lock } from 'lucide-react';

export const SessionTimeoutModal: React.FC = () => {
  const { isAuthenticated, logout } = useApp();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Set a subtle timer that can be triggered or inspected
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      return;
    }

    // After 30 minutes of inactivity, show warning
    const timeout = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);
    }, 30 * 60 * 1000);

    return () => clearTimeout(timeout);
  }, [isAuthenticated]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showWarning && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            logout();
            setShowWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showWarning, countdown, logout]);

  if (!showWarning) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-[12px] shadow-[0_12px_24px_rgba(20,58,107,0.15)] border border-[#DCE6F2] w-full max-w-md p-6 text-center space-y-4 animate-scaleUp">
        <div className="w-12 h-12 bg-[#FFF1D6] text-[#7A4A00] rounded-full flex items-center justify-center mx-auto border border-[#B26A00]/30">
          <Clock className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-[#143A6B]">
          Inactivity Warning: Session Expiring Soon
        </h3>
        <p className="text-xs text-[#4A6280] leading-relaxed">
          In compliance with AICTE Information Security Policies, your portal session will expire due to inactivity in:
        </p>
        <div className="text-3xl font-extrabold text-[#7A4A00] font-mono">
          00:{countdown < 10 ? `0${countdown}` : countdown}
        </div>
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={logout}
            className="min-h-[40px] flex-1 py-2 px-3 border border-[#DCE6F2] rounded-[8px] text-xs font-semibold text-[#4A6280] hover:bg-[#F3F7FC] cursor-pointer transition-colors"
          >
            Logout Now
          </button>
          <button
            onClick={() => {
              setShowWarning(false);
              setCountdown(60);
            }}
            className="min-h-[40px] flex-1 py-2 px-3 bg-[#1D6BB5] hover:bg-[#143A6B] text-white rounded-[8px] text-xs font-semibold cursor-pointer shadow-xs transition-colors"
          >
            Stay Signed In
          </button>
        </div>
      </div>
    </div>
  );
};
