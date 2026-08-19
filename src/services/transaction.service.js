const mongoose = require("mongoose");
const transactionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("./email.service");
const ApiError = require("../utils/apiError");

async function createTransaction({ fromAccount, toAccount, amount, idempotencyKey, user }) {
  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    throw new ApiError(400, "fromAccount, toAccount, amount and idempotencyKey are required");
  }

  const fromUserAccount = await accountModel.findOne({ _id: fromAccount });
  const toUserAccount = await accountModel.findOne({ _id: toAccount });

  if (!fromUserAccount || !toUserAccount) {
    throw new ApiError(404, "One or both accounts not found");
  }

  // Check Idempotency Key
  const existingTransaction = await transactionModel.findOne({ idempotencyKey });
  if (existingTransaction) {
    if (existingTransaction.status === "COMPLETED") {
      return {
        statusCode: 200,
        message: "Transaction already completed",
        status: "success",
        transaction: existingTransaction,
      };
    }
    if (existingTransaction.status === "PENDING") {
      return {
        statusCode: 200,
        message: "Transaction is pending",
        status: "success",
        transaction: existingTransaction,
      };
    }
    if (existingTransaction.status === "FAILED") {
      throw new ApiError(500, "Transaction already failed");
    }
    if (existingTransaction.status === "REVERSED") {
      throw new ApiError(500, "Transaction already reversed");
    }
  }

  // Check Account Status
  if (fromUserAccount.status !== "ACTIVE" || toUserAccount.status !== "ACTIVE") {
    throw new ApiError(400, "One or both accounts are not active");
  }

  // Check balance
  const balance = await fromUserAccount.getBalance();
  if (balance < amount) {
    throw new ApiError(
      400,
      `Insufficient balance. Current balance is ${balance}. Requested amount is ${amount}`
    );
  }

  // Mongoose Session for Atomic Money Transfer
  const session = await mongoose.startSession();
  session.startTransaction();

  let transaction;
  try {
    const [createdTransaction] = await transactionModel.create(
      [
        {
          fromAccount,
          toAccount,
          amount,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session }
    );
    transaction = createdTransaction;

    await ledgerModel.create(
      [
        {
          account: fromAccount,
          type: "DEBIT",
          amount: amount,
          transaction: transaction._id,
        },
      ],
      { session }
    );

    await ledgerModel.create(
      [
        {
          account: toAccount,
          type: "CREDIT",
          amount: amount,
          transaction: transaction._id,
        },
      ],
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

  // Send email asynchronously
  if (user && user.email) {
    emailService.sendTransactionEmail(user.email, user.name, amount, toUserAccount._id).catch((err) => {
      console.error("Failed to send transaction email:", err.message);
    });
  }

  return {
    statusCode: 200,
    message: "Transaction completed successfully",
    status: "success",
    transaction,
  };
}

async function createInitialFunds({ toAccount, amount, idempotencyKey, systemUserId }) {
  if (!toAccount || !amount || !idempotencyKey) {
    throw new ApiError(400, "toAccount, amount and idempotencyKey are required");
  }

  const toUserAccount = await accountModel.findOne({ _id: toAccount });
  if (!toUserAccount) {
    throw new ApiError(404, "Account not found");
  }

  const fromAccount = await accountModel.findOne({ user: systemUserId });
  if (!fromAccount) {
    throw new ApiError(404, "System account not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  let transaction;
  try {
    const [createdTransaction] = await transactionModel.create(
      [
        {
          fromAccount: fromAccount._id,
          toAccount,
          amount,
          idempotencyKey,
          status: "PENDING",
        },
      ],
      { session }
    );
    transaction = createdTransaction;

    await ledgerModel.create(
      [
        {
          account: fromAccount._id,
          type: "DEBIT",
          amount: amount,
          transaction: transaction._id,
        },
      ],
      { session }
    );

    await ledgerModel.create(
      [
        {
          account: toAccount,
          type: "CREDIT",
          amount: amount,
          transaction: transaction._id,
        },
      ],
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

  return {
    statusCode: 201,
    message: "Initial funds transaction completed successfully",
    status: "success",
    transaction,
  };
}

module.exports = {
  createTransaction,
  createInitialFunds,
};
