"use strict";

function DB(redis) {
	this.redis = redis;
	this.keyPartner = "partner";
	this.keyChats = "chats";
}

DB.prototype.getStats = function(callback) {
	var self = this;
	return new Promise(function(resolve, reject) {
		self.redis.multi()
			.scard(self.keyChats)
			.hlen(self.keyPartner)
			.exec(function(err, res) {
				if(err) { 
					console.error("DB error: " + err);
					reject(err);
				} else {
					resolve({
						users: res[0],
						chats: res[1]/2
					});
				}
			});
	});
}

DB.prototype.rememberChat = function(chatId) {
	this.redis.sadd(this.keyChats, chatId);
}

module.exports = DB;
