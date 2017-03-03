"use strict";

const TelegramBot = require("node-telegram-bot-api");
const Redis = require("redis");

const token = "180445993:AAHghLnBrO-e5HgD-1X_J9V1XBQ_qwslpL4";

const bot = new TelegramBot(token, {polling: true});
const REDIS_URL = process.env.REDIS_URL || "127.0.0.1:6379";
const redisClient = Redis.createClient(REDIS_URL);

redisClient.on("error", (err) => { console.error("Redis error: " + err); });

const redisPartner = "partner";
const redisWaiting = "waiting";

bot.onText(/\/start/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, 
			"Привет! Это бот для анонимного чата. В нём ты сможешь найти анонимного собеседника на любую тему, и прервать разговор в любую минуту, если он тебе не понравится.\n\n" +
			"Набери /new, чтобы найти себе собеседника.");
});

bot.onText(/\/end/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;
	const chatId = msg.chat.id;
	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (partnerId) {
			redisClient.multi()
				.hdel(redisPartner, chatId)
				.hdel(redisPartner, partnerId)
				.exec(function(err) {
					bot.sendMessage(chatId, "Ты закончил чат. Набери /new, чтобы найти нового собеседника!");
					bot.sendMessage(partnerId, "Собеседник завершил чат. Набери /new, чтобы начать новый разговор!");
				});
		} else {
			bot.sendMessage(chatId, 
					"У тебя сейчас нет собеседника, так что ты не можешь закончить чат.\n\n" +
					"Чтобы послать кого-нибудь ненужного, надо сначала начать диалог с кем-нибудь ненужным! Набери /new для того, чтобы это сделать.");
		}
	});
});

bot.onText(/\/new[ ]*(.*)/, (msg, match) => {
	if (msg.eaten) { return; }
	msg.eaten = true;
	const chatId = msg.chat.id;
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
										const successMessage = "Ура! Вы начали новый чат.";
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

bot.onText(/.*/, (msg) => {
	if (msg.eaten) { return; }
	msg.eaten = true;
	const chatId = msg.chat.id;
	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (err) return;
		if (!partnerId) {
			bot.sendMessage(chatId, 
					"У вас сейчас нет партнёра по чату. Наберите /new, чтобы начать новый чат");
		} else {
			bot.sendMessage(partnerId, msg.text);
		}
	});
});
