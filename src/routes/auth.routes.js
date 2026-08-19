const express = require("express");
const authController = require("../controllers/auth.controller");
const validate = require("../middleware/validate.middleware");
const { registerSchema, loginSchema } = require("../validators/schemas");

const router = express.Router();

// POST /api/auth/register
router.post("/register", validate(registerSchema), authController.userRegisterController);

// POST /api/auth/login
router.post("/login", validate(loginSchema), authController.userLoginController);

// POST /api/auth/logout
router.post("/logout", authController.userLogoutController);

module.exports = router;