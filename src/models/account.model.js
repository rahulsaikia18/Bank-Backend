const mongoose = require("mongoose");
const ledgerModel = require("./ledger.model");

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Account must be associated with a user"],
    },
    status: {
      type: String,
      enum: {
        values: ["ACTIVE", "FROZEN", "CLOSED"],
        message: "Status must be either ACTIVE, FROZEN, or CLOSED",
      },
      default: "ACTIVE",
    },
    currency: {
      type: String,
      required: [true, "Currency is required for creating account"],
      default: "INR",
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────
//
// Index 1: { user: 1 }
// Queries: account.service.js —
//   find({ user: userId })           → list accounts for a user (GET /api/accounts)
//   countDocuments({ user: userId }) → pagination total count
//   findOne({ _id, user: userId })   → ownership check on balance fetch
//   findOne({ user: systemUserId })  → look up system user's account for deposits
// Without this index every query would scan the full accounts collection.
//
accountSchema.index({ user: 1 });

// Index 2: { user: 1, status: 1 }
// Query (future): find({ user: userId, status: "ACTIVE" })
// When filtering accounts by status (e.g. "show only active accounts"),
// MongoDB can satisfy the query entirely from this index without touching documents.
// The leading `user` field keeps it a "covered index" for single-user scoped queries.
//
accountSchema.index({ user: 1, status: 1 });

accountSchema.methods.getBalance = async function () {
  const balanceData = await ledgerModel.aggregate([
    { $match: { account: this._id } },
    {
      $group: {
        _id: null,
        totalDebit: {
          $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] },
        },
        totalCredit: {
          $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        balance: { $subtract: ["$totalCredit", "$totalDebit"] },
      },
    },
  ]);

  if (balanceData.length === 0) return 0;
  return balanceData[0].balance;
};

const accountModel = mongoose.model("account", accountSchema);

module.exports = accountModel;
