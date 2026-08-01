import { parsePhoneNumberFromString } from "libphonenumber-js/min";

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
