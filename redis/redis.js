var bluebird = require('bluebird');
var redis = require('redis');
var client = bluebird.promisifyAll(redis.createClient(process.env.REDIS_URL));
//bluebird.promisifyAll(redis.Multi.prototype);

module.exports = client;


