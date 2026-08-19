const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    fromAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "From account is required for creating transaction"],
    },
    toAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "To Account is required for creating transaction"],
    },
    status: {
      type: String,
      enum: {
        values: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
        message: "Status must be either PENDING, COMPLETED, FAILED or REVERSED",
      },
      default: "PENDING",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required for creating transaction"],
      min: [0, "Amount must be greater than or equal to 0"],
    },
    idempotencyKey: {
      type: String,
      required: [true, "Idempotency key is required for creating transaction"],
      unique: true, // ← implicit unique index (see Index 1 below)
    },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
//
// Index 1: { idempotencyKey: 1 } UNIQUE  (auto-created by unique:true above)
// Query: transaction.service.js — findOne({ idempotencyKey })
// Every transfer checks this field first to detect duplicate submissions.
// The unique constraint also enforces at the DB level that no two transfers
// share the same key, even under concurrent writes.
//
// (Declared explicitly here for documentation; Mongoose creates it from unique:true)
transactionSchema.index({ idempotencyKey: 1 }, { unique: true });

// Index 2: { fromAccount: 1, createdAt: -1 }
// Query: GET /api/transactions?accountId=X (sent transactions, sorted newest-first)
// A user's "sent" transaction history is always scoped to fromAccount and
// ordered by date. Without this compound index, MongoDB would fetch ALL
// transactions for that account and sort them in memory (COLLSCAN + in-memory sort).
// With it, the index delivers results already sorted — no sort stage needed.
//
transactionSchema.index({ fromAccount: 1, createdAt: -1 });

// Index 3: { toAccount: 1, createdAt: -1 }
// Query: GET /api/transactions?accountId=X (received transactions, sorted newest-first)
// Same reasoning as Index 2, but for the recipient side.
// Both indexes together allow an efficient UNION when showing a full
// account statement (sent + received).
//
transactionSchema.index({ toAccount: 1, createdAt: -1 });

// Index 4: { status: 1, createdAt: -1 }
// Query: admin/audit — "show all PENDING transactions older than X minutes"
// Used for monitoring stuck transactions, cron-based timeout jobs, and
// admin dashboards. Without this index the query would scan every transaction.
//
transactionSchema.index({ status: 1, createdAt: -1 });

const transactionModel = mongoose.model("transaction", transactionSchema);

module.exports = transactionModel;