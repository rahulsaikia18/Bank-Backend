const { Queue } = require("bullmq");
const redisClient = require("../config/redis");
const logger = require("../utils/logger");

const emailQueue = new Queue("emailQueue", {
  connection: redisClient,
});

/**
 * Adds an email job to the queue with exponential backoff strategy
 */
const enqueueEmail = async (jobName, payload) => {
  if (process.env.NODE_ENV === "test") return; // Skip actual queuing in Jest tests

  try {
    await emailQueue.add(jobName, payload, {
      attempts: 4, // Initial attempt + 3 retries
      backoff: {
        type: "exponential",
        delay: 5000, // 5s, 10s, 20s...
      },
      removeOnComplete: true,
      removeOnFail: false, // Keep failed jobs for inspection
    });
    logger.info({ message: "Email job enqueued", jobName, to: payload.to });
  } catch (error) {
    logger.error({ message: "Failed to enqueue email job", error: error.message });
  }
};

module.exports = {
  emailQueue,
  enqueueEmail,
};
