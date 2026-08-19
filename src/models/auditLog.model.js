const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: [true, "Audit log must be associated with a user"],
    },
    action: {
      type: String,
      required: true, // e.g., 'TRANSFER_INITIATED', 'TRANSFER_COMPLETED', 'TRANSFER_FAILED'
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "transaction",
    },
    amount: {
      type: Number,
    },
    sourceAccount: {
      type: String, // Stored masked (e.g. ******************1234)
    },
    destinationAccount: {
      type: String, // Stored masked
    },
    status: {
      type: String,
      enum: ["SUCCESS", "FAILED", "PENDING"],
      required: true,
    },
    failureReason: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
//
// Index 1: { user: 1, createdAt: -1 }
// Query: "Show all audit logs for a specific user, newest first"
// Essential for customer support tracking user activity.
auditLogSchema.index({ user: 1, createdAt: -1 });

// Index 2: { action: 1, createdAt: -1 }
// Query: "Show all failed transfers in the last 24 hours"
// Essential for system monitoring and security auditing.
auditLogSchema.index({ action: 1, createdAt: -1 });

const auditLogModel = mongoose.model("auditLog", auditLogSchema);

module.exports = auditLogModel;
