const accountService = require("../services/account.service");
const asyncHandler = require("../utils/asyncHandler");

const createAccount = asyncHandler(async (req, res) => {
  const account = await accountService.createAccount(req.user._id);
  res.status(201).json(account);
});

const getUserAccounts = asyncHandler(async (req, res) => {
  const accounts = await accountService.getUserAccounts(req.user._id);
  res.status(200).json(accounts);
});

const getAccountBalance = asyncHandler(async (req, res) => {
  const { accountId } = req.params;
  const result = await accountService.getAccountBalance(accountId, req.user._id);
  res.status(200).json(result);
});

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountBalance,
  getUsrAccount: getUserAccounts, // Alias for backward compatibility
};
