const amqp = require("amqplib");
const dotenv = require("dotenv");
dotenv.config();

async function mailSender(email, subject, message, html) {
    try{

        const mailExchange = "mail_exchange";
        const mailQueue = "mail_queue";
        const routingKey = "bind_key";

        const connection = await amqp.connect(process.env.AMQP_URL);
        const channel = await connection.createChannel();

        
        await channel.assertExchange(mailExchange, "direct", {durable: true});
        await channel.assertQueue(mailQueue, {
            durable: true,
            arguments: {
                "x-dead-letter-exchange": "dlq_exchange",
                "x-dead-letter-routing-key": "bind_key"
            }
        });
        await channel.bindQueue(mailQueue, mailExchange, routingKey);
      
        channel.publish(mailExchange, routingKey, Buffer.from(JSON.stringify({ email, subject, message, html })));
        
        console.log(`[x] Sent event mail to ${email}`);
        
        await channel.close();
        await connection.close();
 
    }catch(err){
        console.log(err);
    }
 
}

module.exports = mailSender;