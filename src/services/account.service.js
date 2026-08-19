const accountModel = require("../models/account.model");
const ApiError = require("../utils/apiError");

async function createAccount(userId, currency = "INR") {
  const account = await accountModel.create({ user: userId, currency });
  return account;
}

async function getUserAccounts(userId, { page = 1, limit = 10 } = {}) {
  const skip = (page - 1) * limit;

  const [accounts, total] = await Promise.all([
    accountModel.find({ user: userId }).skip(skip).limit(limit).lean(),
    accountModel.countDocuments({ user: userId }),
  ]);

  return {
    accounts,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getAccountBalance(accountId, userId) {
  const account = await accountModel.findOne({ _id: accountId, user: userId });
  if (!account) {
    throw new ApiError(404, "Account not found");
  }

  const balance = await account.getBalance();
  return {
    accountId: account._id,
    currency: account.currency,
    balance,
  };
}

module.exports = {
  createAccount,
  getUserAccounts,
  getAccountBalance,
};
