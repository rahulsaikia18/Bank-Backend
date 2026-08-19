const accountService = require("../services/account.service");
const asyncHandler = require("../utils/asyncHandler");

const createAccount = asyncHandler(async (req, res) => {
  const { currency } = req.body; // validated & defaulted by Zod
  const account = await accountService.createAccount(req.user._id, currency);
  res.status(201).json({ success: true, account });
});

const getUserAccounts = asyncHandler(async (req, res) => {
  const { page, limit } = req.query; // coerced to numbers by Zod
  const result = await accountService.getUserAccounts(req.user._id, { page, limit });
  res.status(200).json({ success: true, ...result });
});

const getAccountBalance = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const result = await accountService.getAccountBalance(accountId, req.user._id);
  res.status(200).json({ success: true, ...result });
});

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountBalance,
  getUsrAccount: getUserAccounts, // backward-compat alias
};
