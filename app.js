"use strict";

const TelegramBot = require("node-telegram-bot-api");
const Redis = require("redis");

const token = "180445993:AAHghLnBrO-e5HgD-1X_J9V1XBQ_qwslpL4";

const bot = new TelegramBot(token, {polling: true});
const redisClient = Redis.createClient();

redisClient.on("error", (err) => { console.error("Redis error: " + err); });

const redisPartner = "partner";
const redisWaiting = "waiting";

bot.onText(/\/end/, (msg) => {
	const chatId = msg.chat.id;
	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		redisClient.multi()
			.hdel(redisPartner, chatId)
			.hdel(redisPartner, partnerId)
			.exec(function(err) {
				bot.sendMessage(chatId, "Chat ended.");
				bot.sendMessage(partnerId, "Stranger ended chat.");
			});
	});
});

bot.onText(/\/new/, (msg) => {
	const chatId = msg.chat.id;
	bot.sendMessage(chatId, "Looking for partner...");
	redisClient.lpop(redisWaiting, function(err, partnerId) {
		if (partnerId) {
			redisClient.multi()
				.hset(redisPartner, chatId, partnerId)
				.hset(redisPartner, partnerId, chatId)
				.exec(function(err) {
					const successMessage = "Congradulations! You're now chatting with a stranger.";
					bot.sendMessage(chatId, successMessage);
					bot.sendMessage(partnerId, successMessage);
				});
			bot.sendMessage
		} else {
			redisClient.rpush(redisWaiting, chatId, function(err) {
				bot.sendMessage(chatId, "No available partners. Put you in the waiting list...");
			});
		}
	});
});

bot.on('message', (msg) => {
	const chatId = msg.chat.id;
	redisClient.hget(redisPartner, chatId, function(err, partnerId) {
		if (err) return;
		if (!partnerId) {
			bot.sendMessage(chatId, 
					"You don't have a chat partner. Start a new chat with /new");
		} else {
			bot.sendMessage(partnerId, msg.text);
		}
	});
});
