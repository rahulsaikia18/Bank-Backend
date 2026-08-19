const { z } = require("zod");

// ─── Auth ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),

  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be at most 72 characters"),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Invalid email address")
    .toLowerCase(),

  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

// ─── Account ───────────────────────────────────────────────────────────────

const createAccountSchema = z.object({
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .refine((val) => ["INR", "USD", "EUR", "GBP"].includes(val), {
      message: "Currency must be one of INR, USD, EUR, GBP",
    })
    .optional()
    .default("INR"),
});

// ─── Transaction ────────────────────────────────────────────────────────────

const mongoIdRegex = /^[a-f\d]{24}$/i;

const transferSchema = z.object({
  fromAccount: z
    .string({ required_error: "fromAccount is required" })
    .regex(mongoIdRegex, "fromAccount must be a valid account ID"),

  toAccount: z
    .string({ required_error: "toAccount is required" })
    .regex(mongoIdRegex, "toAccount must be a valid account ID"),

  amount: z
    .number({ required_error: "amount is required", invalid_type_error: "amount must be a number" })
    .positive("amount must be greater than 0")
    .finite("amount must be a finite number"),

  idempotencyKey: z
    .string({ required_error: "idempotencyKey is required" })
    .trim()
    .min(1, "idempotencyKey cannot be empty")
    .max(255, "idempotencyKey is too long"),
});

const initialFundsSchema = z.object({
  toAccount: z
    .string({ required_error: "toAccount is required" })
    .regex(mongoIdRegex, "toAccount must be a valid account ID"),

  amount: z
    .number({ required_error: "amount is required", invalid_type_error: "amount must be a number" })
    .positive("amount must be greater than 0")
    .finite("amount must be a finite number"),

  idempotencyKey: z
    .string({ required_error: "idempotencyKey is required" })
    .trim()
    .min(1, "idempotencyKey cannot be empty")
    .max(255, "idempotencyKey is too long"),
});

// ─── Pagination ─────────────────────────────────────────────────────────────

const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, "page must be at least 1")),

  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1, "limit must be at least 1").max(100, "limit must be at most 100")),
});

module.exports = {
  registerSchema,
  loginSchema,
  createAccountSchema,
  transferSchema,
  initialFundsSchema,
  paginationSchema,
};
