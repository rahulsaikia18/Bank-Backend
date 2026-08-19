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
  windowMs: 5 * 60 * 1000,
  max: 10,
  skip: skipTests,
  standardHeaders: true,
  legacyHeaders: false,
  store: process.env.NODE_ENV === "test" ? undefined : new RedisStore({
    prefix: "rl:auth:",
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: {
    success: false,
    message: "Too many authentication attempts, please try again after 5 minutes.",
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
};
