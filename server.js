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
		result.setWebHook(`${APP_URL}/bot${TELEGRAM_TOKEN}`);
		console.log("Set up webhook");
		return result;
	} else {
		console.log("Running locally");
		let result = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
		console.log("Set up polling");
		return result;
	}
}) ();

const redisClient = Redis.createClient(REDIS_URL);
const DB = require("./db");
const db = new DB(redisClient);

redisClient.on("error", (err) => { console.error("Redis error: " + err); });

const Start = require("./commands/start");
const start = new Start(db, bot);

const Stats = require("./commands/stats");
const stats = new Stats(db, bot);

const End = require("./commands/end");
const end = new End(db, bot);

const GOD_ID = process.env.GOD_ID;

const Broadcast = require("./commands/broadcast");
const broadcast = new Broadcast(db, bot, GOD_ID);

const New = require("./commands/new");
const new_ = new New(db, bot);

const commands = [start, stats, end, broadcast, new_];

bot.on('message', (msg) => {
	console.log("Message", msg);
	const chatId = msg.chat.id;
	db.rememberChat(msg.chat);
	db.rememberUser(msg.from);

	for(let i = 0; i < commands.length; i++) {
		if (commands[i].tryEat(msg)) {
			return;
		}
	}

	if (msg.text && msg.text[0] == '/') {
		bot.sendMessage(chatId, "Извини, такая команда мне неизвестна.");
		return;
	}

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
				bot.sendAudio(partnerId, msg.audio.file_id);
			} else if (msg.video) {
				bot.sendVideo(partnerId, msg.video.file_id);
			} else if (msg.document) {
				bot.sendDocument(partnerId, msg.document.file_id);
			} else if (msg.game) {
				bot.sendMessage(chatId, 
						"Извини, этот бот пока не умеет пересылать игры. Ведутся работы.");
				bot.sendMessage(partnerId, 
						"Твой собеседник попытался переслать тебе игру, но я пока не умею этого делать.");
			} else if (msg.photo) {
				let photoSizes = msg.photo;
				let photoId = photoSizes[0].file_id;
				bot.sendPhoto(partnerId, photoId, options);
			} else if (msg.voice) {
				bot.sendVoice(partnerId, msg.voice.file_id);
			} else {
				bot.sendMessage(partnerId, msg.text);
			}
		}
	});
});
