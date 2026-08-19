const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redisClient = require("../config/redis");

const standardMessage = {
  success: false,
  message: "Too many requests, please try again later.",
};

const skipTests = () => process.env.NODE_ENV === "test";

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: skipTests,
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV === "test" ? undefined : new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: standardMessage,
});

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 login/register attempts per minute
  skip: skipTests,
  statusCode: 429, // Explicitly enforce 429 Too Many Requests
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV === "test" ? undefined : new RedisStore({
    prefix: "rl:auth:",
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 1 minute.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
