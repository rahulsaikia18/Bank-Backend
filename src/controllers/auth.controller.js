const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

const userRegisterController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body; // validated by Zod
  const result = await authService.registerUser({ email, password, name });

  res.cookie("token", result.token, { httpOnly: true });
  res.status(201).json({ success: true, ...result });
});

const userLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body; // validated by Zod
  const result = await authService.loginUser({ email, password });

  res.cookie("token", result.token, { httpOnly: true });
  res.status(200).json({ success: true, ...result });
});

const userLogoutController = asyncHandler(async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  const result = await authService.logoutUser(token);

  res.clearCookie("token");
  res.status(200).json({ success: true, ...result });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const result = await authService.getUserProfile(req.user._id);
  res.status(200).json({ success: true, user: result });
});

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
  getUserProfile,
};
