const mongoose = require("mongoose");

const ledgerSchema = new mongoose.Schema(
  {
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "account",
      required: [true, "Ledger entry must be associated with an account"],
      immutable: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required for creating ledger entry"],
      immutable: true,
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
      required: [true, "Ledger entry must be associated with a transaction"],
      immutable: true,
    },
    type: {
      type: String,
      enum: {
        values: ["DEBIT", "CREDIT"],
        message: "Type must be either DEBIT or CREDIT",
      },
      required: [true, "Type is required for creating ledger entry"],
      immutable: true,
    },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
//
// Index 1: { account: 1 }
// Query: account.model.js getBalance() — aggregate([{ $match: { account: this._id } }])
// Every call to getBalance() scans ledger entries for a specific account.
// This is the hottest query in the system — called on every balance check
// and before every transfer. Without this index MongoDB would scan the
// entire ledger collection on each balance calculation.
//
ledgerSchema.index({ account: 1 });

// Index 2: { transaction: 1 }
// Query: "show all ledger lines for a transaction" (audit / reconciliation)
// When tracing a transaction's double-entry (one DEBIT + one CREDIT line),
// this index allows instant lookup of both entries by transaction ID
// without scanning the full ledger.
//
ledgerSchema.index({ transaction: 1 });

// Index 3: { account: 1, type: 1 }
// Query (future): aggregate total debits or credits for an account separately
// e.g. "total amount sent this month" → $match: { account, type: "DEBIT", createdAt: ... }
// The compound index avoids a full collection scan when filtering by both
// account and entry type in reporting or statement queries.
//
ledgerSchema.index({ account: 1, type: 1 });

// ─── Immutability guards ─────────────────────────────────────────────────────
function preventLedgerModification() {
  throw new Error("Ledger entries cannot be modified or deleted");
}

ledgerSchema.pre("findOneAndUpdate", preventLedgerModification);
ledgerSchema.pre("updateOne", preventLedgerModification);
ledgerSchema.pre("deleteOne", preventLedgerModification);
ledgerSchema.pre("findOneAndDelete", preventLedgerModification);
ledgerSchema.pre("findOneAndRemove", preventLedgerModification);
ledgerSchema.pre("remove", preventLedgerModification);
ledgerSchema.pre("updateMany", preventLedgerModification);
ledgerSchema.pre("deleteMany", preventLedgerModification);
ledgerSchema.pre("findOneAndReplace", preventLedgerModification);

const ledgerModel = mongoose.model("ledger", ledgerSchema);

module.exports = ledgerModel;
