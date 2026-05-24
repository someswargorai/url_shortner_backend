const amqp = require("amqplib");

const EXCHANGE = "click_exchange";
const QUEUE = "click_queue";
const DLQ_EXCHANGE = "click_dlq_exchange";
const ROUTING_KEY = "click_routing_key"; // ← consistent key

let channel = null; // reuse channel, don't reconnect every time

async function getChannel() {
  if (channel) return channel;
  const connection = await amqp.connect(process.env.AMQP_URL);
  channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, "direct", { durable: true });
  await channel.assertQueue(QUEUE, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": DLQ_EXCHANGE,
      "x-dead-letter-routing-key": ROUTING_KEY,
    },
  });
  await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

  return channel;
}

async function clickBatchProcessor(clicks) {
  try {
    const ch = await getChannel();
    for (const click of clicks) {
      ch.publish(
        EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(click)),
        { persistent: true }, // survives RabbitMQ restart
      );
    }
    console.log(`Published ${clicks.length} click(s) to queue`);
  } catch (err) {
    console.error("Failed to publish click:", err);
  }
}

module.exports = clickBatchProcessor;
