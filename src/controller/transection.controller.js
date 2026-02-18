const transectionModel = require("../models/transaction.model");
const ledgerModel = require("../models/ledger.model");
const accountModel = require("../models/account.model");
const emailService = require("../services/email.service");
const mongoose = require("mongoose");

async function createTransection(req, res) {
  /**
   * - Validate the request body to ensure that all required fields are present and valid.
   */
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;

  if (!fromAccount || !toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "fromAccount, toAccount, amount and idempotencyKey are required",
      status: "error",
    });
  }
  const fromUserAccount = await accountModel.findOne({
    _id: fromAccount,
  });
  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });
  if (!fromUserAccount || !toUserAccount) {
    return res.status(404).json({
      message: "One or both accounts not found",
      status: "error",
    });
  }

  /**
   * - Validate The Idempotency Key
   */
  const isTransectionExist = await transectionModel.findOne({
    idempotencyKey: idempotencyKey,
  });

  if (isTransectionExist) {
    if (isTransectionExist.status === "COMPLETED") {
      return res.status(200).json({
        message: "Transection already completed",
        status: "success",
        transection: isTransectionExist,
      });
    }

    if (isTransectionExist.status === "PENDING") {
      return res.status(200).json({
        message: "Transection is pending",
        status: "success",
        transection: isTransectionExist,
      });
    }
    if (isTransectionExist.status === "FAILED") {
      return res.status(500).json({
        message: "Transection already failed",
        status: "error",
        transection: isTransectionExist,
      });
    }
    if (isTransectionExist.status === "REVERSED") {
      return res.status(500).json({
        message: "Transection already reversed",
        status: "error",
        transection: isTransectionExist,
      });
    }
  }

  /**
   * - Check Account Status
   */

  if (
    fromUserAccount.status !== "ACTIVE" ||
    toUserAccount.status !== "ACTIVE"
  ) {
    return res.status(400).json({
      message: "One or both accounts are not active",
      status: "error",
    });
  }

  /**
   * - Drive sender balance from ledger
   */

  const balance = await fromUserAccount.getBalance();
  if (balance < amount) {
    return res.status(400).json({
      message: `Insufficient balance. Current balance is ${balance}. Requested balance is ${amount}`,
      status: "error",
    });
  }

  /**
   * - Create Transection
   */
  const session = await mongoose.startSession();
  session.startTransaction();
  const transection = (await transectionModel.create([{
    fromAccount,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  }],{session}))[0];

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromAccount,
        type: "DEBIT",
        amount: amount,
        transection: transection._id,
      },
    ],
    { session },
  );

  await (() => {
    return new Promise((resolve) => setTimeout(resolve, 100 * 1000));
  });

  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        type: "CREDIT",
        amount: amount,
        transection: transection._id,
      },
    ],
    { session },
  );

  await transectionModel.findOneAndUpdate(
    {_id:transection._id},
    {status:"COMPLETED"},
    {session}
  )
  
  await transection.save({ session });
  await session.commitTransaction();
  session.endSession();

  /**
   * - Send Email Notification to both sender and receiver
   */
  await emailService.sendTransactionEmail({
    userEmail: req.user.email,
    name: req.user.name,
    amount,
    toAccount: toUserAccount._id,
  });
  return res.status(200).json({
    message: "Transection completed successfully",
    status: "success",
    transection,
  });
}

/**
 * - Create Initial Funds Transection
 * - This API will be used to create a transection for initial funds when a new account is created. This API will be called by the system user.
 */
async function createInitialFunds(req, res) {
  const { toAccount, amount, idempotencyKey } = req.body;

  if (!toAccount || !amount || !idempotencyKey) {
    return res.status(400).json({
      message: "toAccount, amount and idempotencyKey are required",
      status: "error",
    });
  }
  const toUserAccount = await accountModel.findOne({
    _id: toAccount,
  });
  // console.log("toUserAccount", toUserAccount);
  if (!toUserAccount) {
    return res.status(404).json({
      message: "Account not found",
      status: "error",
    });
  }

  const fromAccount = await accountModel.findOne({
    user: req.user._id,
  });

  // console.log("fromAccount", fromAccount);
  if (!fromAccount) {
    return res.status(404).json({
      message: "System account not found",
      status: "error",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  const transection = new transectionModel({
    fromAccount: fromAccount._id,
    toAccount,
    amount,
    idempotencyKey,
    status: "PENDING",
  });
  // console.log("transection", transection);

  const debitLedgerEntry = await ledgerModel.create(
    [
      {
        account: fromAccount._id,
        type: "DEBIT",
        amount: amount,
        transection: transection._id,
      },
    ],
    { session },
  );
  const creditLedgerEntry = await ledgerModel.create(
    [
      {
        account: toAccount,
        type: "CREDIT",
        amount: amount,
        transection: transection._id,
      },
    ],
    { session },
  );
  transection.status = "COMPLETED";
  await transection.save({ session });
  await session.commitTransaction();
  session.endSession();

  return res.status(201).json({
    message: "Initial funds transection completed successfully",
    status: "success",
    transection,
  });
}

module.exports = {
  createTransection,
  createInitialFunds,
};
