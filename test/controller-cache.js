// it('default score (syntax)', function () {
//     let res = createResponse();
//     let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
//     myController.redisClient = redis.createClient();
//     return new Promise((resolve, reject) => {
//       myController.cache({ max: 100, strategy: 'LFU', namespace: 'fooze' }, cache => {
//         cache({ user_id: 9 });
//         cache({ user_id: 6 });
//         myController.cache({ max: 100, strategy: 'LFU', namespace: 'fooze' }).hit(resolve).exec();
//       })
//     });
//   });

//   it('setOptions', function () {
//     let res = createResponse();
//     let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
//     myController.redisClient = redis.createClient();
//     return new Promise((resolve, reject) => {
//       myController.actionCache('Get').setOptions({rebuild: true});
//       myController.cache({ max: 100, strategy: 'LFU', namespace: 'fooze' }, cache => {
//         cache({ user_id: 9 });
//         cache({ user_id: 6 });
//         myController.cache({ max: 100, strategy: 'LFU', namespace: 'fooze' }).hit(resolve).exec();
//       })
//     });
//   });

require("rooty")();
const assert = require("chai").assert;
const Controller = require("../index");
const ControllerCache = require('../controller-cache');
let redis = require("redis");
let client = redis.createClient();

describe("ControllerCache", function() {

  beforeEach(function(done) {
    client.flushall(done);
  });

  it("setOptions rebuild", function() {
    let cache = new ControllerCache (
      client,
      'UsersController',
      'Get'
    );
    assert.doesNotThrow(() => cache.setOptions({}, true));
  });

  it("default score should return the new date (syntax)", function() {
    let cache = new ControllerCache (
      client,
      'UsersController',
      'Get'
    );
    assert.doesNotThrow(cache.options.score);
  });

  it("default action name", function() {
    let cache = new ControllerCache (
      client,
      'CTL'
    );
    assert.equal(cache.namespace, 'CTL#UNDEFINED-ACTION');
  });
});
