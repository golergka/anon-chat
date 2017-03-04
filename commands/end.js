"use strict";

const Command = require("./command");

class End extends Command {
	constructor(db, bot) {
		super("end", db, bot);
	}

	_deletePartners(chatId, partnerId) {
		const self = this;
		this._db.deletePartners(chatId, partnerId)
		.then(function() {
			self._bot.sendMessage(chatId, 
				"Ты закончил чат. Набери /new, чтобы найти нового собеседника!");
			if (chatId != partnerId) {
				self._bot.sendMessage(partnerId, 
					"Собеседник завершил чат. Набери /new, чтобы начать новый разговор!");
			}
		});

	}

	_noPartnerError(chatId) {
		this._bot.sendMessage(chatId, 
			"У тебя сейчас нет собеседника, так что ты не можешь закончить чат.\n\n" +
			"Чтобы послать кого-нибудь ненужного, надо сначала начать диалог с кем-нибудь ненужным! Набери /new для того, чтобы это сделать.");
	}

	tryEat(msg) {
		const match = this._re.exec(msg.text);
		if (!match) { return false; }

		const chatId = msg.chat.id; 
		const self = this;
		this._db.getPartner(chatId)
		.then(function(partnerId) {
			if (!partnerId) {
				self._noPartnerError(chatId);
			} else {
				self._deletePartners(chatId, partnerId);
			}
		});
		return true;
	}
}

module.exports = End;
