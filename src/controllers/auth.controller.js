const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

const userRegisterController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body; // validated by Zod
  const result = await authService.registerUser({ email, password, name });

  res.cookie("token", result.token, { httpOnly: true, maxAge: 15 * 60 * 1000 }); // 15 mins
  res.cookie("refreshToken", result.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }); // 7 days
  res.status(201).json({ success: true, ...result });
});

const userLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body; // validated by Zod
  const result = await authService.loginUser({ email, password });

  res.cookie("token", result.token, { httpOnly: true, maxAge: 15 * 60 * 1000 });
  res.cookie("refreshToken", result.refreshToken, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.status(200).json({ success: true, ...result });
});

const refreshTokenController = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const result = await authService.refreshAccessToken(refreshToken);

  res.cookie("token", result.token, { httpOnly: true, maxAge: 15 * 60 * 1000 });
  res.status(200).json({ success: true, ...result });
});

const userLogoutController = asyncHandler(async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  const refreshToken = req.cookies?.refreshToken || req.body.refreshToken;
  const result = await authService.logoutUser(token, refreshToken);

  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.status(200).json({ success: true, ...result });
});

const getUserProfile = asyncHandler(async (req, res) => {
  const result = await authService.getUserProfile(req.user._id);
  res.status(200).json({ success: true, user: result });
});

module.exports = {
  userRegisterController,
  userLoginController,
  refreshTokenController,
  userLogoutController,
  getUserProfile,
};
