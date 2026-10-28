/**
 * Format number into Indian Rupee format (e.g. ₹ 10,00,000)
 */
export const formatINR = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹ 0';
  return '₹ ' + amount.toLocaleString('en-IN');
};

/**
 * Format standard date into readable DD MMM YYYY
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

/**
 * Mask FDR number to show only last 4 digits (e.g., ••••••••3948)
 */
export const maskFdrNumber = (fdrNo: string, showFull: boolean = false): string => {
  if (!fdrNo) return '—';
  if (showFull) return fdrNo;
  if (fdrNo.length <= 4) return fdrNo;
  const lastFour = fdrNo.slice(-4);
  const maskedPrefix = '•'.repeat(Math.max(4, fdrNo.length - 4));
  return `${maskedPrefix}${lastFour}`;
};

/**
 * Calculate days remaining until maturity
 */
export const getDaysUntilMaturity = (maturityDateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const matDate = new Date(maturityDateStr);
  matDate.setHours(0, 0, 0, 0);
  const diffTime = matDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Validate Indian Bank IFSC code format (e.g., SBIN0001234: 4 letters, 0, 6 letters/digits)
 */
export const isValidIFSC = (ifsc: string): boolean => {
  const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return regex.test(ifsc.toUpperCase().trim());
};

/**
 * Generate a synthetic 5-character Captcha string
 */
export const generateCaptchaText = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};
