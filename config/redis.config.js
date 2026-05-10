const Redis = require("ioredis");

require("dotenv").config();

const client = new Redis(process.env.REDIS_URL);

module.exports = client;