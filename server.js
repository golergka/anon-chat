"use strict";

const TelegramBot = require("node-telegram-bot-api");
const Redis = require("redis");

const REDIS_URL = process.env.REDIS_URL;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "180445993:AAHghLnBrO-e5HgD-1X_J9V1XBQ_qwslpL4";
console.log("TELEGRAM_TOKEN: " + TELEGRAM_TOKEN);

const bot = (function() {
	const PORT		= process.env.PORT;
	const APP_URL	= process.env.APP_URL || "https://talkon.herokuapp.com:443";
	console.log("Port: " + PORT);
	console.log("App url: " + APP_URL);
	if (PORT && APP_URL) {
		console.log("Running on Heroku");
		let result = new TelegramBot(TELEGRAM_TOKEN, { webHook: { port: PORT }});
		result.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);
		console.log("Set up webhook");
		return result;
	} else {
		console.log("Running locally");
		let result = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
		console.log("Set up polling");
		return result;
	}
}) ();

const GOD_ID = process.env.GOD_ID;

const redisClient = Redis.createClient(REDIS_URL);
const DB = require("./db");
const db = new DB(redisClient);

redisClient.on("error", (err) => { console.error("Redis error: " + err); });

bot.onText(/^\/stats/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	db.getStats()
		.then(function(stats) {
			bot.sendMessage(chatId, 
					"Пользователей: " + stats.users + "\n" +
					"Чатов: " + stats.chats);
		})
		.catch(function(err) {
			bot.sendMessage(chatId, "Что-то пошло не так");
		});
});

bot.onText(/^\/end/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	db.getPartner(chatId)
		.then(function(partnerId) {
			if (partnerId) {
				db.deletePartners(chatId, partnerId)
					.then(function() {
						bot.sendMessage(chatId, "Ты закончил чат. Набери /new, чтобы найти нового собеседника!");
						if (chatId != partnerId) {
							bot.sendMessage(partnerId, "Собеседник завершил чат. Набери /new, чтобы начать новый разговор!");
						}
					});
			} else {
				bot.sendMessage(chatId, 
						"У тебя сейчас нет собеседника, так что ты не можешь закончить чат.\n\n" +
						"Чтобы послать кого-нибудь ненужного, надо сначала начать диалог с кем-нибудь ненужным! Набери /new для того, чтобы это сделать.");
			}
		});
});

bot.onText(/^\/broadcast (.+)/, (msg, match) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	if (GOD_ID && msg.from.id === GOD_ID) {
		let broadcast = match[1];
		bot.sendMessage(chatId, "Принято к исполнению, мой господин.");
		db.forAllChats(function(chatId) {
			return bot.sendMessage(chatId, broadcast);
		}).then(function() {
			bot.sendMessage(chatId, "Рассылка завершена, мой господин.");
		}).catch(function(err) {
			bot.sendMessage(chatId, "Что-то пошло не так: " + err);
		});
	} else {
		bot.sendMessage(chatId, "Это не для тебя команда.");
	}
});

function startSelfChat(chatId) {
	db.removeWaiting(chatId)
	.then(() => db.setPartner(chatId, chatId))
	.then(() => bot.sendMessage(chatId, 
				"Поздравляю! Вы начали чат с самим собой. Попытайтесь себя не разочаровать."));
}

function startNewChat(chatId, partnerId) {
	db.setPartner(chatId, partnerId)
	.then(function() {
		const successMessage = "Ура! Вы начали новый чат.\n\n" +
			"Наберите /end когда надоест, чтобы прекратить.";
		bot.sendMessage(chatId, successMessage);
		bot.sendMessage(partnerId, successMessage);
	});
}

function findNewChat(chatId) {
	db.popWaiting()
	.then(function(partnerId) {
		if (!partnerId) {
			db.addWaiting(chatId)
			.then(() => bot.sendMessage(chatId, 
						"Сейчас партнёров нет. Вы поставлены в список ожидания"));
		} else {
			startNewChat(chatId, partnerId);
		}
	})
}

function tryFindNewChat(chatId) {
	db.isWaiting(chatId)
	.then(function(isWaiting) {
		if (isWaiting) {
			bot.sendMessage(chatId, "Вы уже находитесь в списке ожидания.");
		} else {
			bot.sendMessage(chatId, "Ищу собеседника...");
			findNewChat(chatId);
		}
	})
}

bot.onText(/^\/new[ ]*(.*)/, (msg, match) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	db.getPartner(chatId)
	.then(function(partnerId) {
		if (partnerId) {
			bot.sendMessage(chatId, 
					"Ты не можешь начать новый чат, пока ты уже общаешься с кем-то. Набери /end, чтобы сначала закончить текущий чат.");
		} else if (match[1] === "self") {
			startSelfChat(chatId);
		} else {
			tryFindNewChat(chatId);
		}
	});
});

bot.onText(/^(\/.*)/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	bot.sendMessage(chatId, "Извини, такая команда мне неизвестна.");
});

const Start = require("./commands/start");
const start = new Start(db, bot);

bot.on('message', (msg) => {
	console.log("Got message!");
	if (start.tryEat(msg)) {
		return;
	}

	if (msg.text && msg.text[0] == '/') return;
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	db.rememberChat(chatId);

	db.getPartner(chatId)
	.then(function(partnerId) {
		if (!partnerId) {
			bot.sendMessage(chatId, 
					"У вас сейчас нет партнёра по чату. Наберите /new, чтобы начать новый чат");
		} else {
			let options = {};
			const caption = msg.caption;
			if (caption) { options.caption = caption; }

			if (msg.sticker) {
				bot.sendSticker(partnerId, msg.sticker.file_id, options);
			} else if (msg.audio) {
				bot.sendAudio(partnerId, msg.audio, options);
			} else if (msg.document) {
				bot.sendDocument(partnerId, msg.document, options);
			} else if (msg.game) {
				bot.sendGame(partnerId, msg.game, options);
			} else if (msg.photo) {
				bot.sendPhoto(partnerId, msg.photo, options);
			} else if (msg.voice) {
				bot.sendVoice(partnerId, msg.voice, options);
			} else {
				bot.sendMessage(partnerId, msg.text);
			}
		}
	});
});
