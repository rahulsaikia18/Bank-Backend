const { Router } = require("express");
const { authMiddleware, authMiddlewareSystemUser } = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");
const validate = require("../middleware/validate.middleware");
const { transferSchema, initialFundsSchema } = require("../validators/schemas");

const router = Router();

/**
 * POST /api/transactions
 * Create a money transfer — Protected
 */
router.post(
  "/",
  authMiddleware,
  validate(transferSchema),
  transactionController.createTransaction
);

/**
 * POST /api/transactions/system/initial-funds
 * Deposit initial funds — System user only
 */
router.post(
  "/system/initial-funds",
  authMiddlewareSystemUser,
  validate(initialFundsSchema),
  transactionController.createInitialFunds
);

module.exports = router;
