const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlacklistModel = require("../models/blacklist.model");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");

const authMiddleware = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }

  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    throw new ApiError(401, "Unauthorized access, token is invalid.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId);
    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Unauthorized");
  }
});

const authMiddlewareSystemUser = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }
  const isBlacklisted = await tokenBlacklistModel.findOne({ token });
  if (isBlacklisted) {
    throw new ApiError(401, "Unauthorized access, token is invalid.");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await userModel.findById(decoded.userId).select("+systemUser");
    if (!user || !user.systemUser) {
      throw new ApiError(403, "Forbidden: System user required");
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Unauthorized");
  }
});

module.exports = {
  authMiddleware,
  authMiddlewareSystemUser,
};
