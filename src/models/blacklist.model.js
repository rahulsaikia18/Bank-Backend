const mongoose = require("mongoose");

const tokenBlacklistSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: [true, "Token is Required to blacklist"],
      unique: true, // ← implicit unique index (see Index 1 below)
    },
  },
  { timestamps: true }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
//
// Index 1: { token: 1 } UNIQUE  (auto-created by unique:true above)
// Query: auth.middleware.js — findOne({ token }) on EVERY authenticated request.
// This is the second hottest query in the system — it runs before every
// protected API call to check whether the JWT was revoked on logout.
// The unique constraint also prevents duplicate blacklist entries.
//
// (Auto-created; declared explicitly here for documentation purposes)
tokenBlacklistSchema.index({ token: 1 }, { unique: true });

// Index 2: { createdAt: 1 } — TTL index (auto-expires documents)
// Blacklisted tokens are only meaningful for the duration of the JWT
// (3 days). MongoDB's TTL mechanism automatically removes expired entries,
// keeping the collection small. Without this, the blacklist would grow
// forever and the findOne({ token }) lookup would degrade over time.
//
tokenBlacklistSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 3 } // 3 days, matching JWT expiry
);

const tokenBlacklistModel = mongoose.model("tokenBlacklist", tokenBlacklistSchema);

module.exports = tokenBlacklistModel;