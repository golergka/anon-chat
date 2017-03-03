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

DB.prototype.getPartner = function(chatId) {
	let self = this;
	return new Promise(function(resolve, reject) {
		self.redis.hget(self.keyPartner, chatId, function(err, partnerId) {
			if (err) {
				reject(err);
			} else {
				resolve(partnerId);
			}
		});
	});
}

DB.prototype.setPartner = function(firstId, secondId) {
	let self = this;
	return new Promise(function(resolve, reject) {
		let multi = self.redis.multi();
		multi.hset(self.keyPartner, firstId, secondId);
		if (firstId != secondId) {
			multi.hset(self.keyPartner, secondId, firstId);
		}
		multi.exec(function(err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

DB.prototype.deletePartners = function(firstId, secondId) {
	let self = this;
	return new Promise(function(resolve, reject) {
		let multi = redisClient.multi();
		multi.hdel(self.keyPartner, firstId);
		if (firstId != secondId) {
			multi.hdel(self.keyPartner, secondId);
		}
		multi.exec(function(err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

module.exports = DB;
