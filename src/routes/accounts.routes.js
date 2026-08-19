const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const accountController = require("../controllers/account.controller");

const router = express.Router();

/**
 * - POST /api/accounts/
 * - Create a new account
 * - Protected route, requires authentication
 */
router.post("/", authMiddleware, accountController.createAccount);

/**
 * - GET /api/accounts/
 * - Get User accounts
 * - Protected route, requires authentication
 */
router.get("/", authMiddleware, accountController.getUserAccounts);

/**
 * - GET /api/accounts/balance/:accountId
 * - Get account balance
 * - Protected route, requires authentication
 */
router.get("/balance/:accountId", authMiddleware, accountController.getAccountBalance);

module.exports = router;