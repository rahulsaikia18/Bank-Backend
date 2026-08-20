const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { authMiddleware } = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/rateLimiter");
const { registerSchema, loginSchema } = require("../validators/schemas");

const router = express.Router();

// POST /api/auth/register
router.post("/register", authLimiter, validate(registerSchema), authController.userRegisterController);

// POST /api/auth/login
router.post("/login", authLimiter, validate(loginSchema), authController.userLoginController);

// POST /api/auth/refresh
router.post("/refresh", authController.refreshTokenController);

// POST /api/auth/logout
router.post("/logout", authController.userLogoutController);

// GET /api/auth/me (Cached via Redis)
router.get("/me", authMiddleware, authController.getUserProfile);

module.exports = router;