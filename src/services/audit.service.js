const auditLogModel = require("../models/auditLog.model");
const logger = require("../utils/logger");

/**
 * Masks a sensitive string (like an ObjectId or Bank Account string)
 * Keeps only the last 4 characters visible, replacing the rest with '*'
 * Example: '507f1f77bcf86cd799439011' -> '********************9011'
 */
const maskIdentifier = (identifier) => {
  if (!identifier) return null;
  const str = String(identifier);
  if (str.length <= 4) return "***";
  const visible = str.slice(-4);
  const masked = "*".repeat(str.length - 4);
  return `${masked}${visible}`;
};

/**
 * Creates an immutable audit log entry for financial operations.
 * Fire-and-forget: we don't await it in the main thread to avoid blocking.
 */
const logAudit = async ({
  user,
  action,
  transactionId = null,
  amount = null,
  sourceAccount = null,
  destinationAccount = null,
  status,
  failureReason = null,
  reqMeta = {},
}) => {
  try {
    await auditLogModel.create({
      user,
      action,
      transactionId,
      amount,
      sourceAccount: maskIdentifier(sourceAccount),
      destinationAccount: maskIdentifier(destinationAccount),
      status,
      failureReason,
      ipAddress: reqMeta.ipAddress || "UNKNOWN",
      userAgent: reqMeta.userAgent || "UNKNOWN",
    });
  } catch (err) {
    // Audit log failures should NEVER crash the main application,
    // but MUST be caught by the core logging system (Winston/Datadog)
    logger.error({
      message: "CRITICAL: Failed to write to AuditLog collection",
      error: err.message,
      action,
      user,
    });
  }
};

module.exports = {
  logAudit,
  maskIdentifier,
};
