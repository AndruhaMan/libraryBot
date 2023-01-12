const functions = require("firebase-functions");
const {Telegraf, Markup} = require("telegraf");
const https = require("https");

let config = require ("./env.json");
if (Object.keys(functions.config()).length) {
	config = functions.config();
}

const API_BASE_URL = 'https://www.googleapis.com/books/v1/volumes/';
const NO_COVER_IMG_LINK = 'https://upload.wikimedia.org/wikipedia/commons/9/9b/No_cover.JPG?20070608130414';
let startIndex;

const bot = new Telegraf(config.service.bot_token);

bot.start((ctx) => {
    ctx.reply("Enter the title of book you want to find");
});

bot.on('text', async (ctx) => {
    startIndex = 0;
    let query = ctx.message.text;
    await searchBook(ctx, query, function question() {
        ctx.reply('Didn\'t find the book?', Markup.inlineKeyboard([Markup.button.callback('More results', 'butt_more')]));
        addMoreButton('butt_more', query, question);
    });
});

async function searchBook(ctx, query, callback) {
    query = '?q=' + query.split(' ').join('+');
    query += `&startIndex=${startIndex}` + '&maxResults=5' + '&printType=books' + '&download=epub';
    await find(query, async (err, res) => {
        if (err) {
            await ctx.reply("Sorry, we have a problem(");
            console.log(err)
        } else {
            let foundBooks = [...res.items];
            for (let book of foundBooks) {
				let butName = `book_${book.id}`;
                await ctx.replyWithPhoto({url: book.volumeInfo?.imageLinks?.thumbnail || NO_COVER_IMG_LINK},
					{
						caption: `"${book.volumeInfo.title}"`,
						...Markup.inlineKeyboard([Markup.button.callback('Press to take more info', butName)])
					});
				await addDescriptionButton(butName, book.id);
            }
            callback();
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

function addDescriptionButton(name, id) {
    bot.action(name, async (ctx) => {
        try {
            await ctx.answerCbQuery();
            await find(id, async (err, res) => {
                if (err) {
                    await ctx.reply("Sorry, we have a problem(");
                    console.log(err);
                } else {
					const info = res.volumeInfo;
                    let description = info.description || "This book doesn't have description";
					description = description.replace(/<\/?[^>]+(>|$)/g, "");
					description = description.replace("  ", " ");
					let authors = info.authors || "The author is unknown";
					authors = authors.join(', ');
                    await ctx.replyWithPhoto({url: info?.imageLinks?.small || info?.imageLinks?.thumbnail || NO_COVER_IMG_LINK},
                        {caption: `"${info.title}"\nAuthors: ${authors}`});
                    await ctx.reply('Publisher: ' + (info?.publisher || 'Unfortunately, we don\'t know(') + '\n' +
                        'Count of pages: ' + (info?.pageCount || 'Unfortunately, we don\'t know(') + '\n' +
                        'Publication date: ' + (info?.publishedDate || 'Unfortunately, we don\'t know(') + '\n' +
                        'Price: ' + (res?.saleInfo?.retailPrice?.amount || 'Unfortunately, we don\'t know(') + '\n' +
                        'Description: ' + '\n' + description + '\n\n' +
                        'Read a sample: ' + (res?.accessInfo?.webReaderLink || 'Unfortunately, we don\'t know(') + '\n' +
                        'Link in Google Books: ' + (info?.infoLink || 'Unfortunately, we don\'t know('));
                }
            });
        } catch (e) {
            await ctx.reply("Sorry, we have a problem(");
            console.log(e);
        }
    });
}

function addMoreButton(name, query, callback) {
    bot.action(name, async (ctx) => {
        try {
            startIndex += 5;
            await ctx.answerCbQuery();
            await searchBook(ctx, query, callback);
        } catch (e) {
            await ctx.reply("Sorry, we have a problem(");
            console.log(e);
        }
    });
}

bot.launch();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});
