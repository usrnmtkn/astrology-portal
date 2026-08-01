import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js/min";

const usCountryCallingCode = "+1";
const usNationalNumberLength = 10;

export function formatUsPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const nationalDigits = (
    digits.length > usNationalNumberLength && digits.startsWith("1")
      ? digits.slice(1)
      : digits
  ).slice(0, usNationalNumberLength);

  return new AsYouType("US").input(nationalDigits);
}

export function normalizeUsPhoneNumber(value: string) {
  const parsedPhone = parsePhoneNumberFromString(value, {
    defaultCountry: "US",
    extract: false
  });

  if (!parsedPhone || !parsedPhone.isValid() || parsedPhone.country !== "US") {
    throw new Error("Enter a valid United States mobile number.");
  }

  return parsedPhone.number;
}

export function formatPhoneNumberForDisplay(value: string) {
  return parsePhoneNumberFromString(value)?.formatInternational() ?? value;
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
  try {
    normalizeUsPhoneNumber(value);
    return true;
  } catch {
    return false;
  }
}

export const supportedPhoneCountry = {
  code: "US",
  name: "United States",
  callingCode: usCountryCallingCode
} as const;
