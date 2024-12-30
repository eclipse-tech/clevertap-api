// api/constants.js
export const apiHeaders = {
  "X-CleverTap-Account-Id": process.env.ACCOUNT_ID,
  "X-CleverTap-Passcode": process.env.PASSCODE,
  "Content-Type": "application/json",
};

export const BASE_URL = "https://api.clevertap.com";
