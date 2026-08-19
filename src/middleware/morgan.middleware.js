const morgan = require("morgan");
const logger = require("../utils/logger");

// Pipe every Morgan HTTP log line into Winston as 'http' level
const stream = {
  write: (message) => logger.http(message.trim()),
};

const morganMiddleware = morgan(
  // Log format: METHOD url status response-time ms — content-length bytes
  ":method :url :status :res[content-length] - :response-time ms",
  { stream }
);

module.exports = morganMiddleware;
