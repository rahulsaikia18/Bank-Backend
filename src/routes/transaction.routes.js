const { Router } = require("express");
const { authMiddleware, authMiddlewareSystemUser } = require("../middleware/auth.middleware");
const transactionController = require("../controllers/transaction.controller");

const router = Router();

/**
 * - POST /api/transactions (or /api/transection)
 * - Create a new transaction
 */
router.post("/", authMiddleware, transactionController.createTransaction);

/**
 * - POST /api/transactions/system/initial-funds
 * - Create a new transaction for initial funds
 */
router.post(
  "/system/initial-funds",
  authMiddlewareSystemUser,
  transactionController.createInitialFunds
);

module.exports = router;
