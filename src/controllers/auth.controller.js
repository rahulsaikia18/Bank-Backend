const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");

const userRegisterController = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const result = await authService.registerUser({ email, password, name });

  res.cookie("token", result.token);
  res.status(201).json(result);
});

const userLoginController = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.loginUser({ email, password });

  res.cookie("token", result.token);
  res.status(200).json(result);
});

const userLogoutController = asyncHandler(async (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.split(" ")[1];
  const result = await authService.logoutUser(token);

  res.clearCookie("token");
  res.status(200).json(result);
});

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController,
};
