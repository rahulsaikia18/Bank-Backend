const accountModel = require("../models/account.model");
const ApiError = require("../utils/apiError");

async function createAccount(userId) {
  const account = await accountModel.create({ user: userId });
  return account;
}

async function getUserAccounts(userId) {
  const accounts = await accountModel.find({ user: userId });
  return accounts;
}

async function getAccountBalance(accountId, userId) {
  const account = await accountModel.findOne({ _id: accountId, user: userId });
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  const balance = await account.getBalance();
  return {
    accountId: account._id,
    balance: balance,
  };
}

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountBalance,
};
