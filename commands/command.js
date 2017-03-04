"use strict";

class Command {
	/**
	 * name: "example" for a command "/example"
	 */
	constructor(name, db, bot) {
		this.name	= name;
		this._re	= new RegExp("^\\/" + name + "(\\s+(.*))*$");
		this._db	= db;
		this._bot	= bot;
	}
}

module.exports = Command;
