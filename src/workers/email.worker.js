const { Worker } = require("bullmq");
const redisClient = require("../config/redis");
const emailService = require("../services/email.service");
const logger = require("../utils/logger");

const emailWorker = new Worker(
  "emailQueue",
  async (job) => {
    const { type, payload } = job.data;
    
    logger.info({ message: "Processing email job", jobId: job.id, type });

    switch (type) {
      case "REGISTRATION":
        await emailService.sendRegistrationEmail(payload.to, payload.name);
        break;
      case "TRANSACTION":
        await emailService.sendTransactionEmail(
          payload.to,
          payload.name,
          payload.amount,
          payload.toAccountId
        );
        break;
      default:
        throw new Error(`Unknown email job type: ${type}`);
    }
  },
  {
    connection: redisClient,
    concurrency: 5, // Process up to 5 emails concurrently
  }
);

emailWorker.on("completed", (job) => {
  logger.info({ message: "Email job completed successfully", jobId: job.id });
});

emailWorker.on("failed", (job, err) => {
  logger.error({ 
    message: "Email job failed", 
    jobId: job.id, 
    error: err.message, 
    attemptsMade: job.attemptsMade 
  });
});

module.exports = emailWorker;
