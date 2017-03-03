"use strict";

function DB(redis) {
	this.redis = redis;
	this.keyPartner = "partner";
	this.keyChats = "chats";
	this.keyWaiting = "waiting";
}

DB.prototype.getStats = function(callback) {
	const self = this;
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
	const self = this;
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
	const self = this;
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
	const self = this;
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
	const self = this;
	return new Promise(function(resolve, reject) {
		let multi = self.redis.multi();
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

DB.prototype.isWaiting = function(chatId) {
	const self = this;
	return new Promise(function(resolve, reject) {
		self.redis.sismemeber(self.keyWaiting, chatId, function(err, isMember) {
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
		self.redis.sadd(self.keyWaiting, chatId, function(err) {
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
		self.redis.spop(self.keyWaiting, function(err, partnerId) {
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
			resolve();
		} else {
			self.redis.srem(self.keyWaiting, chatId, function(err) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		}
	});
}

module.exports = DB;
