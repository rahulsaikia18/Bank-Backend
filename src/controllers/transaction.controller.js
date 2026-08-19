const transactionService = require("../services/transaction.service");
const asyncHandler = require("../utils/asyncHandler");

const createTransaction = asyncHandler(async (req, res) => {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body;
  const result = await transactionService.createTransaction({
    fromAccount,
    toAccount,
    amount,
    idempotencyKey,
    user: req.user,
  });

  const statusCode = result.statusCode || 200;
  const responseData = { ...result };
  delete responseData.statusCode;

  res.status(statusCode).json(responseData);
});

const createInitialFunds = asyncHandler(async (req, res) => {
  const { toAccount, amount, idempotencyKey } = req.body;
  const result = await transactionService.createInitialFunds({
    toAccount,
    amount,
    idempotencyKey,
    systemUserId: req.user._id,
  });

  const statusCode = result.statusCode || 201;
  const responseData = { ...result };
  delete responseData.statusCode;

  res.status(statusCode).json(responseData);
});

module.exports = {
  createTransaction,
  createInitialFunds,
  createTransection: createTransaction, // Alias for backward compatibility
};
