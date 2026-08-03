const usCountryCallingCode = "+1";
const usNationalNumberLength = 10;

function usNationalDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  return (
    digits.length > usNationalNumberLength && digits.startsWith("1")
      ? digits.slice(1)
      : digits
  ).slice(0, usNationalNumberLength);
}

export function formatUsPhoneInput(value: string) {
  const digits = usNationalDigits(value);

  if (digits.length < 3) return digits;
  if (digits.length === 3) return `(${digits})`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function phoneNumberLastFour(value: string) {
  const digits = value.replace(/\D/g, "");

  return digits.slice(-4);
}

export function maskPhoneNumber(value: string) {
  const lastFour = phoneNumberLastFour(value);

  return lastFour ? `••• ••• ${lastFour}` : "••• ••• ••••";
}

export function isValidUsPhoneNumber(value: string) {
  if (/^\s*\+(?!1(?:\D|$))/u.test(value)) return false;

  const digits = value.replace(/\D/g, "");
  const nationalDigits = digits.length === 11 && digits.startsWith("1")
    ? digits.slice(1)
    : digits;

  // Fast form feedback for the North American numbering shape. The metadata-
  // backed validation still runs before an OTP request leaves the browser.
  return /^[2-9]\d{2}[2-9]\d{6}$/u.test(nationalDigits);
}

export const supportedPhoneCountry = {
  code: "US",
  name: "United States",
  callingCode: usCountryCallingCode
} as const;
