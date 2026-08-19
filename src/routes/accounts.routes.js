const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");
const validate = require("../middleware/validate.middleware");
const { createAccountSchema, paginationSchema } = require("../validators/schemas");

const router = express.Router();

/**
 * POST /api/accounts
 * Create a new account — Protected
 */
router.post(
  "/",
  authMiddleware,
  validate(createAccountSchema),
  accountController.createAccount
);

/**
 * GET /api/accounts
 * Get user accounts — Protected, with optional pagination (?page=1&limit=10)
 */
router.get(
  "/",
  authMiddleware,
  validate(paginationSchema, "query"),
  accountController.getUserAccounts
);

/**
 * GET /api/accounts/balance/:accountId
 * Get account balance — Protected
 */
router.get(
  "/balance/:accountId",
  authMiddleware,
  accountController.getAccountBalance
);

module.exports = router;