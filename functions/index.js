const functions = require("firebase-functions");
const {Telegraf} = require("telegraf");

let config = require ("./env.json");
if (Object.keys(functions.config()).length) {
	config = functions.config();
}

const bot = new Telegraf(config.service.bot_token);

bot.start((ctx) => {
    ctx.reply("Hello!");
});

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
