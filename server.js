"use strict";

const TelegramBot = require("node-telegram-bot-api");
const Redis = require("redis");

const REDIS_URL = process.env.REDIS_URL;

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || "180445993:AAHghLnBrO-e5HgD-1X_J9V1XBQ_qwslpL4";

const telegram_options = {
	webHook: {
		port: process.env.PORT
	}
};
const bot = new TelegramBot(TELEGRAM_TOKEN, telegram_options);
const url = process.env.APP_URL || "https://talkon.herokuapp.com:443";
bot.setWebHook(`${url}/bot${TELEGRAM_TOKEN}`);

const GOD_ID = process.env.GOD_ID;

const redisClient = Redis.createClient(REDIS_URL);

redisClient.on("error", (err) => { console.error("Redis error: " + err); });

const redisPartner = "partner";
const redisWaiting = "waiting";
const redisChats = "chats";

bot.onText(/^\/start/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	bot.sendMessage(chatId, 
			"Привет! Это бот для анонимного чата. В нём ты сможешь найти анонимного собеседника на любую тему, и прервать разговор в любую минуту, если он тебе не понравится.\n\n" +
			"Набери /new, чтобы найти себе собеседника.");
});

bot.onText(/^\/stats/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	redisClient.multi()
		.scard(redisChats)
		.hlen(redisPartner)
		.exec(function(err, res) {
			bot.sendMessage(chatId, 
					"Пользователей: " + res[0] + "\n" +
					"Чатов: " + res[1]/2);
		});
});

bot.onText(/^\/end/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (partnerId) {
			redisClient.multi()
				.hdel(redisPartner, chatId)
				.hdel(redisPartner, partnerId)
				.exec(function(err) {
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
	redisClient.sadd(redisChats, chatId);

	if (GOD_ID && msg.from.id === GOD_ID) {
		let broadcast = match;
		bot.sendMessage(chatId, "Принято к исполнению, мой господин.");
		redisClient.smembers(redisChats, function(err, chats) {
			for(let i = 0; i < chats.length; i++) {
				bot.sendMessage(chats[i], match);
			}
		});
	} else {
		bot.sendMessage(chatId, "Это не для тебя команда.");
	}
});

bot.onText(/^\/new[ ]*(.*)/, (msg, match) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (partnerId) {
			bot.sendMessage(chatId, "Ты не можешь начать новый чат, пока ты уже общаешься с кем-то. Набери /end, чтобы сначала закончить текущий чат.");
		} else {
			if (match[1] === "self") {
				var success = function() {
					redisClient.hset(redisPartner, chatId, chatId, function() {
						bot.sendMessage(chatId, "Поздравляю! Вы начали чат с самим собой. Попытайтесь себя не разочаровать.");
					});
				};
				redisClient.sismember(redisWaiting, chatId, function(err, isMember) {
					if (isMember) {
						redisClient.srem(redisWaiting, chatId, success);
					} else {
						success();
					}
				});
			} else {
				redisClient.sismember(redisWaiting, chatId, function(err, isMember) {
					if (isMember) {
						bot.sendMessage(chatId, "Вы уже находитесь в списке ожидания.");
					} else {
						bot.sendMessage(chatId, "Ищу собеседника...");
						redisClient.spop(redisWaiting, function(err, partnerId) {
							if (partnerId) {
								redisClient.multi()
									.hset(redisPartner, chatId, partnerId)
									.hset(redisPartner, partnerId, chatId)
									.exec(function(err) {
										const successMessage = "Ура! Вы начали новый чат.\n\n" +
											"Наберите /end когда надоест, чтобы прекратить.";
										bot.sendMessage(chatId, successMessage);
										bot.sendMessage(partnerId, successMessage);
									});
							} else {
								redisClient.sadd(redisWaiting, chatId, function(err) {
									bot.sendMessage(chatId, "Сейчас партнёров нет. Вы поставлены в список ожидания");
								});
							}
						});
					}
				});
			}
		}
	});
});

bot.onText(/^(\/.*)/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	bot.sendMessage(chatId, "Извини, такая команда мне неизвестна.");
});

bot.on('message', (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;

	const chatId = msg.chat.id;
	redisClient.sadd(redisChats, chatId);

	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (err) return;
		if (!partnerId) {
			bot.sendMessage(chatId, 
					"У вас сейчас нет партнёра по чату. Наберите /new, чтобы начать новый чат");
		} else {
			let options = {};
			const caption = msg.caption;
			if (caption) { options.caption = caption; }

			if (msg.sticker) {
				console.log("Sending sticker...");
				console.log(msg.sticker);
				bot.sendSticker(partnerId, msg.sticker, options);
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
