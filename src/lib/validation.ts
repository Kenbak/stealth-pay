import { z } from "zod";
import bs58 from "bs58";

/**
 * Input validation schemas using Zod
 * Security recommendation: Validate ALL inputs at API boundaries
 */

// Solana wallet address validation
const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export const walletAddressSchema = z
  .string()
  .min(32)
  .max(44)
  .regex(solanaAddressRegex, "Invalid Solana address format")
  .refine((addr) => {
    try {
      const decoded = bs58.decode(addr);
      return decoded.length === 32;
    } catch {
      return false;
    }
  }, "Invalid Solana address");

// Organization schemas
export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z0-9\s\-_.]+$/, "Name contains invalid characters"),
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-zA-Z0-9\s\-_.]+$/)
    .optional(),
});

// Employee schemas
export const createEmployeeSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),
  walletAddress: walletAddressSchema,
  salary: z
    .number()
    .positive("Salary must be positive")
    .max(1_000_000_000, "Salary exceeds maximum"), // 1 billion max
});

export const updateEmployeeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  salary: z.number().positive().max(1_000_000_000).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "TERMINATED"]).optional(),
});

// Payroll schemas
export const createPayrollSchema = z.object({
  tokenMint: walletAddressSchema,
  employeeIds: z.array(z.string().cuid()).optional(),
});

export const executePayrollSchema = z.object({
  signedTransaction: z.string().min(1),
});

// Auth schemas
export const authChallengeSchema = z.object({
  wallet: walletAddressSchema,
});

export const authVerifySchema = z.object({
  wallet: walletAddressSchema,
  signature: z.string().min(1),
  message: z.string().min(1),
  nonce: z.string().length(64), // 32 bytes hex
});

// Deposit schemas
export const depositSchema = z.object({
  amount: z
    .number()
    .positive("Amount must be positive")
    .max(1_000_000_000_000, "Amount exceeds maximum"),
  tokenMint: walletAddressSchema,
});

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// Date range schemas
export const dateRangeSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
}).refine(
  (data) => data.startDate <= data.endDate,
  "Start date must be before end date"
);

/**
 * Validate and parse input with proper error handling
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format error message
  const errors = result.error.errors
    .map((err) => `${err.path.join(".")}: ${err.message}`)
    .join(", ");

  return { success: false, error: errors };
}

/**
 * Sanitize string input (prevent XSS in stored data)
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim()
    .slice(0, 1000); // Limit length
}
