import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js/max";

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

export const supportedPhoneCountry = {
  name: "United States",
  callingCode: usCountryCallingCode
} as const;
