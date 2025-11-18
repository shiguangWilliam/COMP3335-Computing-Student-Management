export function validateName(name: string): string | null {
  if (!name?.trim()) return "Required";
  if (name.length > 50) return "Max 50 characters";
  if (!/^[A-Za-z]+$/.test(name)) return "Only letters are allowed";
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email?.trim()) return "Required";
  if (email.length > 254) return "Email too long";
  const re = /^[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)*@[A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+$/;
  if (!re.test(email)) return "Invalid email address (letters, numbers, underscore; must include @ and .)";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Required";
  if (password.length < 8) return "Minimum 8 characters";
  if (password.length > 72) return "Maximum 72 characters";
  if (!/^[A-Za-z0-9_*]+$/.test(password)) return "Use only letters, numbers, underscore, asterisk";
  return null;
}

export function validateMobile(mobile: string): string | null {
  if (!mobile?.trim()) return "Required";
  if (!/^\+?\d{1,11}$/.test(mobile)) return "Only digits and leading '+', max 11 digits";
  return null;
}

export function validateGender(gender: string): string | null {
  if (!gender?.trim()) return "Required";
  if (!/^([Mm]|[Ff])$/.test(gender)) return "Use M or F";
  return null;
}

export function validateAddress(address: string): string | null {
  if (!address?.trim()) return "Required";
  if (address.length > 255) return "Max 255 characters";
  if (!/^[A-Za-z0-9_\s]+$/.test(address)) return "Use letters, numbers, underscore, space";
  return null;
}

export function validateIdentificationNumber(idn: string): string | null {
  if (!idn?.trim()) return "Required";
  const s = idn.trim().toUpperCase();
  const re = /^[A-Z]\d{6}\([0-9A]\)$/;
  if (!re.test(s)) return "HKID format: 1 letter + 6 digits + (check)";
  return null;
}

export function validateEnrollmentYear(y: string): string | null {
  if (!y?.trim()) return "Required";
  const n = Number(y);
  if (!Number.isInteger(n)) return "Must be integer";
  if (n < 1990 || n > 2100) return "1990–2100";
  return null;
}

export function validateCourseCode(code: string): string | null {
  if (!code?.trim()) return "Required";
  if (code.length > 16) return "Max 16 characters";
  if (!/^[A-Za-z0-9_]+$/.test(code)) return "Use letters, numbers, underscore";
  return null;
}

export function validateCourseName(name: string): string | null {
  if (!name?.trim()) return "Required";
  if (name.length > 50) return "Max 50 characters";
  if (!/^[A-Za-z0-9_ ]+$/.test(name)) return "Use letters, numbers, underscore, space";
  return null;
}

export function sanitizeName(input: string): string {
  return (input || "").replace(/[^A-Za-z]/g, "");
}

export function sanitizeEmail(input: string): string {
  return (input || "").replace(/[^A-Za-z0-9_@.]/g, "");
}

export function sanitizePassword(input: string): string {
  return (input || "").replace(/[^A-Za-z0-9_*]/g, "");
}

export function sanitizeMobile(input: string): string {
  let s = (input || "").replace(/[^0-9+]/g, "");
  s = s.replace(/(?!^)\+/g, "");
  const sign = s.startsWith("+") ? "+" : "";
  const digits = s.replace(/\+/g, "").replace(/[^0-9]/g, "").slice(0, 11);
  return sign + digits;
}

export function sanitizeAddress(input: string): string {
  return (input || "").replace(/[^A-Za-z0-9_\s]/g, "");
}

export function sanitizeIdentificationNumber(input: string): string {
  return (input || "").replace(/[^A-Za-z0-9()]/g, "").toUpperCase().slice(0, 10);
}