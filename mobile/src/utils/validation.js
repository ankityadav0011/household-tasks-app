// Client-side checks that mirror the server rules (the server always re-validates).
export const validateEmail = (value) => {
  const v = (value || '').trim();
  if (!v) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address';
  return null;
};

export const validatePassword = (v) => {
  if (!v) return 'Password is required';
  if (v.length < 8) return 'Password must be at least 8 characters';
  if (v.length > 72) return 'Password must be at most 72 characters';
  if (!/[A-Za-z]/.test(v)) return 'Password must contain at least one letter';
  if (!/\d/.test(v)) return 'Password must contain at least one number';
  return null;
};

export const validateConfirm = (confirm, all) => {
  if (!confirm) return 'Please confirm your password';
  if (confirm !== all.password) return 'Passwords do not match';
  return null;
};

export const validateRequired = (label) => (value) => ((value || '').trim() ? null : `${label} is required`);

export const validateName = (value) => {
  const v = (value || '').trim();
  if (!v) return 'Name is required';
  if (v.length < 2) return 'Name must be at least 2 characters';
  return null;
};

// "+91 98765 43210", "09876543210", "9876543210" all become "9876543210"
export const normalizeMobile = (value) => {
  let digits = (value || '').replace(/[^\d]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return digits;
};

export const validateMobile = (value) => {
  if (!(value || '').trim()) return 'Mobile number is required';
  if (!/^[6-9]\d{9}$/.test(normalizeMobile(value))) return 'Enter a valid 10-digit Indian mobile number';
  return null;
};

export const validateAddress = (value) => {
  const v = (value || '').trim();
  if (!v) return 'Address is required';
  if (v.length < 10) return 'Please enter your full address (at least 10 characters)';
  return null;
};

export const validateBusinessName = (value) =>
  (value || '').trim().length > 100 ? 'Business name must be at most 100 characters' : null;
