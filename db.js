"use strict";

function DB(redis) {
	this.redis = redis;
	this.keyPartner = "partner";
	this.keyChats = "chats";
}

DB.prototype.getStats = function(callback) {
	return new Promise(function(resolve, reject) {
		this.redis.multi()
			.scard(redisChats)
			.hlen(redisPartner)
			.exec(function(err, res) {
				if(err) { 
					reject();
				} else {
					resolve({
						users: res[0],
						chats: res[1]/2
					});
				}
			});
	});
}

module.exports = DB;
