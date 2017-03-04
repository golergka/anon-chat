"use strict";

const Command = require("./command");

class Start extends Command {
	constructor(db, bot) {
		super("start", db, bot);
	}

	tryEat(msg) {
		const match = this._re.exec(msg.text);
		if (!match) {
			return false;
		} else {
			this._bot.sendMessage(
				msg.chat.id,
				"Привет! Это бот для анонимного чата. В нём ты сможешь найти анонимного собеседника на любую тему, и прервать разговор в любую минуту, если он тебе не понравится.\n\n" +
				"Набери /new, чтобы найти себе собеседника.");
			return true;
		}
	}
}

module.exports = Start;
