const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const emailService = require("../services/email.service");
const tokenBlacklistModel = require('../models/blacklist.model')


/**
 * - User Reegister Controller
 * - POST /api/auth/register
 */
async function userRegisterController(req, res) {
  const { email, password, name } = req.body;
  const isExists = await userModel.findOne({
    email: email,
  });

  if (isExists) {
    return res.status(422).json({
      message: "User already exists",
      status: "Failed",
    });
  }

  const user = await userModel.create({
    email,
    password,
    name,
  });

  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );

  res.cookie("token", token);

  res.status(201).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
  await emailService.sendRegistrationEmail(user.email, user.name);
}

/**
 * - User Login Controller
 * - POST /api/auth/login
 */
async function userLoginController(req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({
    email: email,
  }).select("+password");

  if (!user) {
    return res.status(404).json({
      message: "User not found",
      status: "Failed",
    });
  }
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
    return res.status(401).json({
      message: "Invalid password",
      status: "Failed",
    });
  }

  const token = jwt.sign(
    {
      userId: user._id,
    },
    process.env.JWT_SECRET,
    { expiresIn: "3d" },
  );

  res.cookie("token", token);

  res.status(200).json({
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
    },
    token,
  });
}

/**
 * - POST /api/auth/logout
 */
async function userLogoutController(req,res) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

  if(!token){
    return res.status(200).json({
      message:"User Logout Successfully",
    })
  }

  // res.cookie("token","")

  await tokenBlacklistModel.create({
    token:token
  })

  res.clearCookie("token");
  res.status(200).json({
    message:"Logout Successfully",
  })

}

module.exports = {
  userRegisterController,
  userLoginController,
  userLogoutController
};
