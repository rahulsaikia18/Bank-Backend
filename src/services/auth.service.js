const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const tokenBlacklistModel = require("../models/blacklist.model");
const emailService = require("./email.service");
const ApiError = require("../utils/apiError");
const logger = require("../utils/logger");

async function registerUser({ email, password, name }) {
  const isExists = await userModel.findOne({ email });
  if (isExists) {
    throw new ApiError(422, "User already exists");
  }

  const user = await userModel.create({ email, password, name });

  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "3d" }
  );

  emailService.sendRegistrationEmail(user.email, user.name).catch((err) => {
    logger.error({ message: "Failed to send registration email", error: err.message });
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
    throw new ApiError(404, "User not found");
  }

  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    throw new ApiError(401, "Invalid password");
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

module.exports = { registerUser, loginUser, logoutUser };
