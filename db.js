"use strict";

function DB(redis) {
	this.redis = redis;
	this.key = {};
	this.key.partner	= "partner";
	this.key.chats		= "chats";
	this.key.waiting	= "waiting";
	this.key.users		= "users";
}

DB.prototype.getStats = function(callback) {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.multi()
			.scard(self.key.chats)
			.hlen(self.key.partner)
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

DB.prototype.rememberChat = function(chat) {
	this.redis.sadd(this.key.chats, chat.id);
	var chat_key = this.key.chats + ":" + chat.id;
	this.redis.hmset(chat_key, chat);
}

DB.prototype.rememberUser = function(user) {
	this.redis.sadd(this.key.users, user.id);
	var user_key = this.key.users + ":" + user.id;
	this.redis.hmset(user_key, user);
}

DB.prototype.forAllChats = function(worker) {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.smembers(self.key.chats, function(err, chats) {
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
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.hget(self.key.partner, chatId, function(err, partnerId) {
			if (err) {
				reject(err);
			} else {
				resolve(partnerId);
			}
		});
	});
}

DB.prototype.setPartner = function(firstId, secondId) {
	const self = this;
	return new Promise(function(resolve, reject) {
		let multi = self.redis.multi();
		multi.hset(self.key.partner, firstId, secondId);
		if (firstId != secondId) {
			multi.hset(self.key.partner, secondId, firstId);
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
	const self = this;
	return new Promise(function(resolve, reject) {
		let multi = self.redis.multi();
		multi.hdel(self.key.partner, firstId);
		if (firstId != secondId) {
			multi.hdel(self.key.partner, secondId);
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

DB.prototype.isWaiting = function(chatId) {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.sismember(self.key.waiting, chatId, function(err, isMember) {
			if (err) {
				reject(err);
			} else {
				resolve(isMember);
			}
		});
	});
}

DB.prototype.addWaiting = function(chatId) {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.sadd(self.key.waiting, chatId, function(err) {
			if (err) {
				reject(err);
			} else {
				resolve();
			}
		});
	});
}

DB.prototype.popWaiting = function() {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.spop(self.key.waiting, function(err, partnerId) {
			if (err) {
				reject(err);
			} else {
				resolve(partnerId);
			}
		});
	});
}

DB.prototype.removeWaiting = function(chatId) {
	const self = this;
	return self.isWaiting(chatId)
	.then(function(isMember) {
		if (!isMember) {
			return Promise.resolve();
		} else {
			return new Promise(function(resolve, reject) { 
				self.redis.srem(self.key.waiting, chatId, function(err) {
					if (err) {
						reject(err);
					} else {
						resolve();
					}
				});
			});
		}
	});
}

module.exports = DB;
