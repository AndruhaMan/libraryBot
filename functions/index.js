const functions = require("firebase-functions");
const {Telegraf} = require("telegraf");
const https = require("https");

let config = require ("./env.json");
if (Object.keys(functions.config()).length) {
	config = functions.config();
}

const API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes/';

const bot = new Telegraf(config.service.bot_token);

bot.start((ctx) => {
    ctx.reply("Enter the title of book you want to find");
});
bot.on('text', async (ctx) => {
    let query = ctx.message.text;
    await searchBook(ctx, query);
});

async function searchBook(ctx, query) {
    query = '?q=' + query.split(' ').join('+');
    await find(query, async (err, res) => {
        if (err) {
            await ctx.reply("Sorry, we have a problem(");
            console.log(err)
        } else {
            let foundBooks = [...res.items];
            for (let i in foundBooks) {
                await ctx.reply(`"${foundBooks[i].volumeInfo.title}"`);
            }
        }
    });
}

function find(path, callback) {
    let url = API_BASE_URL;
    if(!path) return callback(new Error("Please, enter the book!"));
    url += path;
    https.get(url, (resp) => {
        let body = '';

        resp.on('data', (chunk) => {
            body += chunk;
        });

        resp.on('end', function() {
            let err, data;
            try {
                data = JSON.parse(body);
            } catch (e) {
                err = new Error('Invalid response from Google Books API.');
            }

            if (data.error) {
                callback(new Error(data.error.message));
            } else {
                callback(err, data);
            }

        });

    }).on("error", (err) => {
        callback(err);
    });
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
