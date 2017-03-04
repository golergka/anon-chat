"use strict";

const Command = require("./command");

class New extends Command {
	constructor(db, bot) {
		super("new", db, bot);
	}

	_startNewSelfChat(chatId) {
		const db = this._db;
		const bot = this._bot;

		db.removeWaiting(chatId)
		.then(() => db.setPartner(chatId, chatId))
		.then(() => bot.sendMessage(chatId, 
			"Поздравляю! Вы начали чат с самим собой. Попытайтесь себя не разочаровать."));
	}

	_startNewChat(chatId, partnerId) {
		const db = this._db;
		const bot = this._bot;

		db.setPartner(chatId, partnerId)
		.then(function() {
			const successMessage = "Ура! Вы начали новый чат.\n\n" +
				"Наберите /end когда надоест, чтобы прекратить.";
			bot.sendMessage(chatId, successMessage);
			bot.sendMessage(partnerId, successMessage);
		});
	}

	_findNewChat(chatId) {
		const db = this._db;
		const bot = this._bot;
		const self = this;

		db.popWaiting()
		.then(function(partnerId) {
			if (!partnerId) {
				db.addWaiting(chatId)
				.then(() => bot.sendMessage(chatId, 
					"Сейчас партнёров нет. Вы поставлены в список ожидания"));
			} else {
				self._startNewChat(chatId, partnerId);
			}
		})
	}

	_tryFindNewChat(chatId) {
		const db = this._db;
		const bot = this._bot;
		const self = this;

		db.isWaiting(chatId)
		.then(function(isWaiting) {
			if (isWaiting) {
				bot.sendMessage(chatId, "Вы уже находитесь в списке ожидания.");
			} else {
				bot.sendMessage(chatId, "Ищу собеседника...");
				self._findNewChat(chatId);
			}
		})
	}

	tryEat(msg) {
		const match = this._re.exec(msg.text);
		if (!match) { return false; }

		const chatId = msg.chat.id;
		const db = this._db;
		const bot = this._bot;
		const self = this;

		db.getPartner(chatId)
		.then(function(partnerId) {
			if (partnerId) {
				bot.sendMessage(chatId, 
					"Ты не можешь начать новый чат, пока ты уже общаешься с кем-то. Набери /end, чтобы сначала закончить текущий чат.");
			} else if (match[2] == "self") {
				self._startNewSelfChat(chatId);
			} else {
				self._tryFindNewChat(chatId);
			}
		});

		return true;
	}
}

module.exports = New;
