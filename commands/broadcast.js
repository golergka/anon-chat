"use strict";

const Command = require("./command");

class Broadcast extends Command {
	constructor(db, bot, godId) {
		super("broadcast", db, bot);
		this._godId = godId;
	}

	tryEat(msg) {
		const match = this._re.exec(msg.text);
		if (!match) { return false; }

		const chatId = msg.chat.id;

		if (!this._godId || msg.from.id !== this._godId) {
			this._bot.sendMessage(chatId, "Это не для тебя команда.");
			return true;
		}

		const broadcast = match[2];
		this._bot.sendMessage(chatId, "Принято к исполнению, мой господин.");

		const self = this;
		this._db.forAllChats(function(chatId) {
			return self._bot.sendMessage(chatId, broadcast);
		}).then(function() {
			return self._bot.sendMessage(chatId, "Рассылка завершена, мой господин.");
		}).catch(function(err) {
			self._bot.sendMessage(chatId, "Что-то пошло не так: " + err);
		});

		return true;
	}
}

module.exports = Broadcast;

