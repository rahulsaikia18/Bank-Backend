const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blacklist.model");
const { enqueueEmail } = require("../queues/email.queue");
const AppError = require("../utils/AppError");
const logger = require("../utils/logger");
const redisClient = require("../config/redis");

async function registerUser({ email, password, name }) {
  const isExists = await userModel.findOne({ email });
  if (isExists) {
    throw new AppError("User already exists", 422, "USER_ALREADY_EXISTS");
  }

  const user = await userModel.create({ email, password, name });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );

  // Enqueue registration email (Asynchronous, retries automatically)
  await enqueueEmail("Registration Email", {
    type: "REGISTRATION",
    payload: { to: user.email, name: user.name },
  });

  logger.info({ message: "User registered", userId: user._id, email: user.email });

  return {
    user: { _id: user._id, email: user.email, name: user.name },
    token,
  };
}

async function loginUser({ email, password }) {
  const user = await userModel.findOne({ email }).select("+password");
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    throw new AppError("Invalid password", 401, "INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );

  logger.info({ message: "User logged in", userId: user._id });

  return {
    user: { _id: user._id, email: user.email, name: user.name },
    token,
  };
}

async function logoutUser(token) {
  if (!token) {
    return { message: "User Logout Successfully" };
  }
  await tokenBlacklistModel.create({ token });
  logger.info({ message: "Token blacklisted on logout" });
  return { message: "Logout Successfully" };
}

async function getUserProfile(userId) {
  const cacheKey = `user_profile:${userId}`;
  
  // 1. Check Redis Cache First
  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    logger.info({ message: "Cache hit for user profile", userId });
    return JSON.parse(cachedData);
  }

  // 2. Cache Miss -> Query MongoDB (exclude password)
  logger.info({ message: "Cache miss for user profile", userId });
  const user = await userModel.findById(userId).select("-password -__v");
  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND");
  }

  // 3. Store in Redis (Expire in 1 hour)
  await redisClient.set(cacheKey, JSON.stringify(user), "EX", 3600);
  
  return user;
}

module.exports = { registerUser, loginUser, logoutUser, getUserProfile };
