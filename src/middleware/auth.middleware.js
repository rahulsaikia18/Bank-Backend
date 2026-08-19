const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blacklist.model");
const AppError = require("../utils/AppError");
const asyncHandler = require("../utils/asyncHandler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new AppError("No token provided", 401, "UNAUTHORIZED");
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    throw new AppError("Token has been revoked", 401, "TOKEN_REVOKED");
  }

  // jwt.verify throws JsonWebTokenError / TokenExpiredError
  // — both are caught and normalised by errorHandler.js automatically
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await userModel.findById(decoded.userId);
  if (!user) {
    throw new AppError("User no longer exists", 401, "UNAUTHORIZED");
  }

  req.user = user;
  next();
});

const authMiddlewareSystemUser = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new AppError("No token provided", 401, "UNAUTHORIZED");
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    throw new AppError("Token has been revoked", 401, "TOKEN_REVOKED");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await userModel.findById(decoded.userId).select("+systemUser");
  if (!user || !user.systemUser) {
    throw new AppError("System user access required", 403, "FORBIDDEN");
  }

  req.user = user;
  next();
});

module.exports = { authMiddleware, authMiddlewareSystemUser };
