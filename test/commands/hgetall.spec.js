var assert = require("assert");
var config = require("../lib/config");
var nodeAssert = require("../lib/nodeify-assertions");
var redis = config.redis;

describe("The 'hgetall' method", function () {

    function allTests(parser, ip) {
        describe("using " + parser + " and " + ip, function () {
            var client;

            describe('regular client', function () {
                var args = config.configureClient(parser, ip);

                beforeEach(function (done) {
                    client = redis.createClient.apply(redis.createClient, args);
                    client.once("error", done);
                    client.once("connect", function () {
                        client.flushdb(done);
                    });
                });

                it('handles simple keys and values', function (done) {
                    client.hmset(["hosts", "mjr", "1", "another", "23", "home", "1234"], nodeAssert.isString("OK"));
                    client.HGETALL(["hosts"], function (err, obj) {
                        assert.strictEqual(3, Object.keys(obj).length);
                        assert.strictEqual("1", obj.mjr.toString());
                        assert.strictEqual("23", obj.another.toString());
                        assert.strictEqual("1234", obj.home.toString());
                        return done(err);
                    });
                });

                it('handles fetching keys set using an object', function (done) {
                    client.hmset("msg_test", {message: "hello"}, nodeAssert.isString("OK"));
                    client.hgetall("msg_test", function (err, obj) {
                        assert.strictEqual(1, Object.keys(obj).length);
                        assert.strictEqual(obj.message, "hello");
                        return done(err);
                    });
                });

                it('handles fetching a messing key', function (done) {
                    client.hgetall("missing", function (err, obj) {
                        assert.strictEqual(null, obj);
                        return done(err);
                    });
                });
            });

            describe('binary client', function () {
                var client;
                var args = config.configureClient(parser, ip, {
                    return_buffers: true
                });

                beforeEach(function (done) {
                    client = redis.createClient.apply(redis.createClient, args);
                    client.once("error", done);
                    client.once("connect", function () {
                        client.flushdb(done);
                    });
                });

                it('returns binary results', function (done) {
                    client.hmset(["bhosts", "mjr", "1", "another", "23", "home", "1234", new Buffer([0xAA, 0xBB, 0x00, 0xF0]), new Buffer([0xCC, 0xDD, 0x00, 0xF0])], nodeAssert.isString("OK"));
                    client.HGETALL(["bhosts"], function (err, obj) {
                        assert.strictEqual(4, Object.keys(obj).length);
                        assert.strictEqual("1", obj.mjr.toString());
                        assert.strictEqual("23", obj.another.toString());
                        assert.strictEqual("1234", obj.home.toString());
                        assert.strictEqual((new Buffer([0xAA, 0xBB, 0x00, 0xF0])).toString('binary'), Object.keys(obj)[3]);
                        assert.strictEqual((new Buffer([0xCC, 0xDD, 0x00, 0xF0])).toString('binary'), obj[(new Buffer([0xAA, 0xBB, 0x00, 0xF0])).toString('binary')].toString('binary'));
                        return done(err);
                    });
                });
            });

            afterEach(function () {
                client.end();
            });
        });
    }

    ['javascript', 'hiredis'].forEach(function (parser) {
        allTests(parser, "/tmp/redis.sock");
        ['IPv4', 'IPv6'].forEach(function (ip) {
            allTests(parser, ip);
        })
    });
});
