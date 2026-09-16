/**
 * Money helpers. The backend is authoritative and stores amounts as BIGINT paise.
 * All arithmetic and parsing here uses BigInt / string maths — never floats.
 */

import type { Paise } from "@/types/api";

/** Convert an API money value (possibly a string) to BigInt paise. */
export function toPaise(value: Paise | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  const raw = String(value).trim();
  if (!/^-?\d+$/.test(raw)) return 0n;
  return BigInt(raw);
}

function groupThousands(digits: string): string {
  const [head, ...rest] = [digits];
  void rest;
  // Indian grouping: last 3 digits, then groups of 2.
  if (head.length <= 3) return head;
  const last3 = head.slice(-3);
  const other = head.slice(0, -3);
  return `${other.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

/** Format paise for display, e.g. "100000" -> "₹1,000.00". No rounding. */
export function formatPaise(value: Paise | null | undefined, currency = "INR"): string {
  const paise = toPaise(value);
  const negative = paise < 0n;
  const abs = negative ? -paise : paise;
  const rupees = abs / 100n;
  const fraction = (abs % 100n).toString().padStart(2, "0");
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${negative ? "-" : ""}${symbol}${groupThousands(rupees.toString())}.${fraction}`;
}

export interface ParsedAmount {
  valid: boolean;
  /** Paise as a decimal string, safe to send to the API. */
  paise: string;
  error?: string;
}

/** Parse a user-entered rupee amount into integer paise using string maths. */
export function parseRupeesToPaise(input: string): ParsedAmount {
  const raw = input.trim();
  if (!raw) return { valid: false, paise: "0", error: "Enter an amount" };
  if (!/^\d{1,13}(\.\d{1,2})?$/.test(raw)) {
    return { valid: false, paise: "0", error: "Enter a valid amount in rupees (up to 2 decimals)" };
  }
  const [rupees, decimals = ""] = raw.split(".");
  const paise = `${rupees}${decimals.padEnd(2, "0")}`.replace(/^0+(?=\d)/, "");
  if (BigInt(paise) <= 0n) return { valid: false, paise: "0", error: "Amount must be greater than zero" };
  return { valid: true, paise };
}

/** Turn paise into a plain rupee string for input fields, e.g. "100000" -> "1000.00". */
export function paiseToRupeeInput(value: Paise): string {
  const paise = toPaise(value);
  return `${paise / 100n}.${(paise % 100n).toString().padStart(2, "0")}`;
}
