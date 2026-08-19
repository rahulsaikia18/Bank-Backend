const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("./email.service");
const auditService = require("./audit.service");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");

async function createTransaction({ fromAccount, toAccount, amount, idempotencyKey, user, reqMeta = {} }) {
  try {
    const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
    const toUserAccount = await accountModel.findOne({ _id: toAccount });

    if (!fromUserAccount || !toUserAccount) {
      throw new AppError("One or both accounts not found", 404, "ACCOUNT_NOT_FOUND");
    }

    // Idempotency check
    const existingTransaction = await transactionModel.findOne({ idempotencyKey });
    if (existingTransaction) {
      if (existingTransaction.status === "COMPLETED") {
        return { statusCode: 200, message: "Transaction already completed", status: "success", transaction: existingTransaction };
      }
      if (existingTransaction.status === "PENDING") {
        return { statusCode: 200, message: "Transaction is pending", status: "success", transaction: existingTransaction };
      }
      if (existingTransaction.status === "FAILED") {
        throw new AppError("Transaction already failed", 409, "TRANSACTION_FAILED");
      }
      if (existingTransaction.status === "REVERSED") {
        throw new AppError("Transaction already reversed", 409, "TRANSACTION_REVERSED");
      }
    }

    // Atomic MongoDB session transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    let transaction;
    try {
      // 1. PESSIMISTIC LOCK: Lock the sender account document
      // This serializes any concurrent transactions attempting to debit this account
      const lockedAccount = await accountModel.findOneAndUpdate(
        { _id: fromAccount, status: "ACTIVE" },
        { $set: { updatedAt: new Date() } },
        { session, new: true }
      );

      if (!lockedAccount) {
        throw new AppError("Account not found or inactive", 400, "ACCOUNT_NOT_ACTIVE");
      }

      if (toUserAccount.status !== "ACTIVE") {
        throw new AppError("Recipient account is not active", 400, "ACCOUNT_NOT_ACTIVE");
      }

      // 2. BALANCE CHECK: Calculate balance strictly inside the transaction
      const balanceData = await ledgerModel.aggregate([
        { $match: { account: new mongoose.Types.ObjectId(fromAccount) } },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: { $cond: [{ $eq: ["$type", "DEBIT"] }, "$amount", 0] } },
            totalCredit: { $sum: { $cond: [{ $eq: ["$type", "CREDIT"] }, "$amount", 0] } },
          },
        },
        {
          $project: { _id: 0, balance: { $subtract: ["$totalCredit", "$totalDebit"] } },
        },
      ]).session(session);

      const balance = balanceData.length > 0 ? balanceData[0].balance : 0;

      if (balance < amount) {
        throw new AppError(
          `Insufficient balance. Available: ${balance}, Requested: ${amount}`,
          400,
          "INSUFFICIENT_BALANCE"
        );
      }

      // 3. EXECUTE: Create records
      [transaction] = await transactionModel.create(
        [{ fromAccount, toAccount, amount, idempotencyKey, status: "PENDING" }],
        { session }
      );

      await ledgerModel.create(
        [{ account: fromAccount, type: "DEBIT", amount, transaction: transaction._id }],
        { session }
      );

      await ledgerModel.create(
        [{ account: toAccount, type: "CREDIT", amount, transaction: transaction._id }],
        { session }
      );

      transaction.status = "COMPLETED";
      await transaction.save({ session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

    // Fire-and-forget email
    if (user?.email) {
      emailService
        .sendTransactionEmail(user.email, user.name, amount, toUserAccount._id)
        .catch((err) => logger.error({ message: "Failed to send transaction email", error: err.message }));
    }

    logger.info({ message: "Transaction completed", transactionId: transaction._id, fromAccount, toAccount, amount });

    // SUCCESS AUDIT
    auditService.logAudit({
      user: user._id,
      action: "TRANSFER",
      transactionId: transaction._id,
      amount,
      sourceAccount: fromAccount,
      destinationAccount: toAccount,
      status: "SUCCESS",
      reqMeta,
    });

    return {
      statusCode: 200,
      message: "Transaction completed successfully",
      status: "success",
      transaction,
    };
  } catch (error) {
    // FAILURE AUDIT (Only log if it's not a successful idempotency short-circuit)
    if (user && user._id) {
      auditService.logAudit({
        user: user._id,
        action: "TRANSFER",
        amount,
        sourceAccount: fromAccount,
        destinationAccount: toAccount,
        status: "FAILED",
        failureReason: error.message,
        reqMeta,
      });
    }
    throw error;
  }
}

async function createInitialFunds({ toAccount, amount, idempotencyKey, systemUserId }) {
  const toUserAccount = await accountModel.findOne({ _id: toAccount });
  if (!toUserAccount) {
    throw new AppError("Account not found", 404, "ACCOUNT_NOT_FOUND");
  }

  const fromAccount = await accountModel.findOne({ user: systemUserId });
  if (!fromAccount) {
    throw new AppError("System account not found", 404, "SYSTEM_ACCOUNT_NOT_FOUND");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let transaction;
  try {
    [transaction] = await transactionModel.create(
      [{ fromAccount: fromAccount._id, toAccount, amount, idempotencyKey, status: "PENDING" }],
      { session }
    );

    await ledgerModel.create(
      [{ account: fromAccount._id, type: "DEBIT", amount, transaction: transaction._id }],
      { session }
    );

    await ledgerModel.create(
      [{ account: toAccount, type: "CREDIT", amount, transaction: transaction._id }],
      { session }
    );

    transaction.status = "COMPLETED";
    await transaction.save({ session });
    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }

  logger.info({ message: "Initial funds deposited", transactionId: transaction._id, toAccount, amount });

  // AUDIT
  auditService.logAudit({
    user: systemUserId,
    action: "DEPOSIT_INITIAL_FUNDS",
    transactionId: transaction._id,
    amount,
    sourceAccount: fromAccount._id,
    destinationAccount: toAccount,
    status: "SUCCESS",
  });

  return {
    statusCode: 201,
    message: "Initial funds transaction completed successfully",
    status: "success",
    transaction,
  };
}

module.exports = { createTransaction, createInitialFunds };
