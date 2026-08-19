const transactionService = require("../services/transaction.service");
const asyncHandler = require("../utils/asyncHandler");

const createTransaction = asyncHandler(async (req, res) => {
  const { fromAccount, toAccount, amount, idempotencyKey } = req.body; // validated by Zod
  
  const reqMeta = {
    ipAddress: req.ip || req.connection?.remoteAddress,
    userAgent: req.headers["user-agent"],
  };

  const result = await transactionService.createTransaction({
    fromAccount,
    toAccount,
    amount,
    idempotencyKey,
    user: req.user,
    reqMeta,
  });

  const statusCode = result.statusCode || 200;
  const { statusCode: _sc, ...responseData } = result;

  res.status(statusCode).json({ success: true, ...responseData });
});

const createInitialFunds = asyncHandler(async (req, res) => {
  const { toAccount, amount, idempotencyKey } = req.body; // validated by Zod
  const result = await transactionService.createInitialFunds({
    toAccount,
    amount,
    idempotencyKey,
    systemUserId: req.user._id,
  });

  const statusCode = result.statusCode || 201;
  const { statusCode: _sc, ...responseData } = result;

  res.status(statusCode).json({ success: true, ...responseData });
});

module.exports = {
  createTransaction,
  createInitialFunds,
  createTransection: createTransaction, // backward-compat alias
};
