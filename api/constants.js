// api/constants.js
import dotenv from "dotenv";
dotenv.config();

const ACCOUNT_ID = process.env.ACCOUNT_ID;
const PASSCODE = process.env.PASSCODE;

export const apiHeaders = {
  "X-CleverTap-Account-Id":ACCOUNT_ID,
  "X-CleverTap-Passcode":PASSCODE,
  "Content-Type": "application/json",
};

export const BASE_URL = "https://api.clevertap.com";
