"use strict";

function DB(redis) {
	this.redis = redis;
	this.keyPartner = "partner";
	this.keyChats = "chats";
}

DB.prototype.getStats = function(callback) {
	let self = this;
	return new Promise(function(resolve, reject) {
		self.redis.multi()
			.scard(self.keyChats)
			.hlen(self.keyPartner)
			.exec(function(err, res) {
				if(err) { 
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

DB.prototype.forAllChats = function(worker) {
	let self = this;
	return new Promise(function(resolve, reject) {
		self.redis.smembers(self.keyChats, function(err, chats) {
			if (err) { 
				reject(err);
			} else {
				let tasks = [];
				for(let i = 0; i < chats.length; i++)
				{
					tasks.push(worker(chats[i]));
				}
				Promise.all(tasks)
					.then(resolve)
					.catch(reject);
			}
		});
	});
}

module.exports = DB;
