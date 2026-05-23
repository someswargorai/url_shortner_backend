const redis = require("../config/redis.config");
const airateLimit = (req, res, next) => {
  const userId = req.user.id; // Assuming user ID is available in req.user
  const key = redis.incr(`rate_limit:${userId}`);

  if (key === 1) {
    redis.expire(`rate_limit:${userId}`, 60); // Set expiration time to 60 seconds
    next();
  } else {
    if (key > 4) {
      // Limit to 3 requests per minute
      const ttl = redis.ttl(`rate_limit:${userId}`);
      return res
        .status(429)
        .json({
          message: `Too many requests. Please try again after ${ttl} seconds.`,
        });
    }
    next();
  }
};

module.exports = airateLimit;
