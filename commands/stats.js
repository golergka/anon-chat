"use strict";

const Command = require("./command");

class Stats extends Command {
	constructor(db, bot) {
		super("stats", db, bot);
	}

	tryEat(msg) {
		let match = this._re.exec(msg.text);
		if (!match) {
			return false;
		}
		const self = this;
		this._db.getStats()
		.then(function(stats) {
			self._bot.sendMessage(
				msg.chat.id, 
				"Пользователей: " + stats.users + "\n" +
				"Чатов: " + stats.chats);
		});
		return true;
	}
}

module.exports = Stats;
