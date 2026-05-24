const amqp = require("amqplib");

const EXCHANGE = "event_exchange";
const QUEUE = "event_queue";
const DLQ_EXCHANGE = "event_dlq_exchange";
const ROUTING_KEY = "event_routing_key"; // ← consistent key

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

async function eventBatchProcessor(events) {
  try {
    const ch = await getChannel();
    for (const event of events) {
      ch.publish(
        EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(event)),
        { persistent: true }, // survives RabbitMQ restart
      );
    }
    console.log(`Published ${events.length} event(s) to queue`);
  } catch (err) {
    console.error("Failed to publish event:", err);
  }
}

module.exports = eventBatchProcessor;
