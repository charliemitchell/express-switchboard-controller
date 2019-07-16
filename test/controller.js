require('rooty')();
const assert = require('chai').assert;
const Controller = require('../index');
let redis        = require("redis");
let client       = redis.createClient();

const createResponse = () => {
  return {
    status () { return this; },
    json () { return this; },
    send () { return this; },
    render () { return this; },
    set () { return this; },
    type () { return this; }
  };
}

describe('Controller: cache', function () {

  beforeEach(function (done) {
    client.flushall(done);
  });

  it("throws an error when trying to cache without setting the redisClient", function () {
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, createResponse(), client);
    assert.throws(() => myController.cache('key', {}), Error, 'A redis client is required for UserController');
  });

  it("uses the controller name in the key store", function () {
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, createResponse(), client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache({ user_id: 9 }).then(x => {
          client.keys('*', (err, keys) => {
            if (err) reject(err);
            if (keys.find(key => /^UserController#/.test(key))) {
              resolve();
            } else {
              reject(`could not find 'UserController#' in redis keys ${keys.join(', ')}`);
            }
          })
        });
      })
    });
  })

  it("uses the action name in the key store", function () {
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, createResponse(), client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache({ user_id: 9 }).then(x => {
          client.keys('*', (err, keys) => {
            if (err) reject(err);
            if (keys.find(key => /^UserController#Get/.test(key))) {
              resolve();
            } else {
              reject(`could not find 'UserController#Get' in redis keys ${keys.join(', ')}`);
            }
          })
        });
      })
    });
  })

  it("caches item when setting the redisClient", function () {

    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, createResponse(), client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache({ user_id: 9 }).then(x => {
          client.keys('*', (err, db) => {
            if (err) reject(err);
            client.get(db[0], (err, data) => {
              if (err) reject(err);
              if (data && JSON.parse(data).user_id === 9) {
                resolve();
              } else {
                reject(data + ' Expected user_id to equal 9');
              }
            })
          })
        });
      })
    });
  });

  it('finds an existing cache using fn', function () {
    let res = createResponse();
    let theData = { a: 87654 };
    let myController;
    return new Promise((resolve, reject) => {
      res.set = (k, v) => { res.set = `${k}:${v}`; return res;};
      res.type = type => { res.type = type; return res};
      res.send = function (data) {
        if (data.a !== 87654) {
          return reject(Error("Expected res.send to send `theData`"));
        }
        if (res.type !== 'json') {
          return reject(Error("The default type should be json"))
        }
        if (res.set !== 'X-CACHE-HIT:true') {
          return reject(Error(`\n\tres should set the cache hit header.\n\tExpected: X-CACHE-HIT:true\n\tGot: ${res.set}`))
        }
        resolve();
        return res;
      };
      myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
      myController.redisClient = redis.createClient();

      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache(theData).then(x => {
          myController.cache({ max: 100, strategy: 'LRU' }, () => {});
        });
      })
    });
  });

  it('finds an existing cache using hit,miss,exec', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache({ user_id: 9 }).then(x => {
          myController.cache({ max: 100, strategy: 'LRU' }).hit(resolve).miss(reject).exec();
        });
      })
    });
  });

  it('miss gets called when there is no hit', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }).hit(reject).miss(resolve).exec();
    });
  });

  it('hit/miss/exec works without a hit function', function () {
    let res = createResponse();
    let theData = { a: 87654 };
    let myController;
    return new Promise((resolve, reject) => {
      res.set = (k, v) => { res.set = `${k}:${v}`; return res;};
      res.type = type => { res.type = type; return res};
      res.send = function (data) {
        resolve();
      };
      myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
      myController.redisClient = redis.createClient();

      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache(theData).then(x => {
          myController.cache({ max: 100, strategy: 'LRU' }).exec();
        });
      })
    });
  });

  it('cache works when calling miss function', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }).hit(reject).miss(cache => {
        cache({a: 675});
        myController.cache({ max: 100, strategy: 'LRU' }).hit(resolve).miss(reject).exec()
      }).exec();
    });
  });

  it('warns when using hit/miss without miss', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }).exec().catch(resolve);
    });
  });

  it('actionCache throws when there is no redis client', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    assert.throws(() => myController.actionCache('get'), Error, 'A redis client is required for UserController')
  });

  it('actionCache returns the correct redis namespace', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LRU' }, cache => {
        cache({ user_id: 9 }).then(x => {
          myController.actionCache('Get').count('*').then(resolve);
        });
      })
    });
  });

  it('LFU strategy (syntax)', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LFU' }, cache => {
        cache({ user_id: 9 }).then(resolve);
      })
    });
  });

  it('namespace (syntax)', function () {
    let res = createResponse();
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    myController.redisClient = redis.createClient();
    return new Promise((resolve, reject) => {
      myController.cache({ max: 100, strategy: 'LFU', namespace: 'fooze' }, cache => {
        cache({ user_id: 9 }).then(resolve);
      })
    });
  });

});

describe('Controller: error()', function () {

  it('sets the status code and renders empty json by default', function () {
    let res = {
      theCode: null,
      theJSON: null,
      status (code) {
        this.theCode = code;
        return this;
      },
      json (obj) {
        this.theJSON = JSON.stringify(obj);
        return this;
      }
    };

    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res);
    myController.error();

    assert.equal(res.theCode, 500);
    assert.equal(res.theJSON, '{}');
  })

  it('sets a custom status code and renders the json', function () {
    let res = {
      theCode: null,
      theJSON: null,
      status (code) {
        this.theCode = code;
        return this;
      },
      json (obj) {
        this.theJSON = JSON.stringify(obj);
        return this;
      }
    };

    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res);
    myController.error({status: 404, error: 'not found'});

    assert.equal(res.theCode, 404);
    assert.equal(res.theJSON, JSON.stringify({status: 404, error: 'not found'}));
  })
})

describe('Controller: render', function () {

  let res = {
    status () { return { json () { return 'json' } } },
    json () { return 'json' },
    send () { return 'send' },
    render () { return 'render' }
  };

  it("throws an error when trying to render without setting the view path", function () {
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, res, client);
    assert.throws(() => myController.render({}), Error, 'The view path is not set for UserController');
  });

  it("render sends the correct info to express' res.render", function () {
    let response = {
      render (file, locals) {
        assert.equal(file, 'views/users/edit-profile.pug');
        assert.equal(locals.data, 1)
      }
    }
    let myController = new Controller({ _switchboard_controller: 'UserController', action: 'Get', url: '/widgets', body: {} }, response, client);
    myController.viewPath = 'views/users';
    myController.render('edit-profile.pug', {data: 1})
  });

});

describe('Controller: Permit', function () {

  function body () {
    return {
      foo : true,
      bar : 1,
      fox : 'trot',
      stuff : [1, 2, 3],
      user: {
        name : 'Frank Larry',
        admin: true,
        friend : {
          user : {
            name : "Steve Jims"
          }
        }
      }
    }
  }

  let res = {
    status () { return { json () { return 'json' } } },
    json () { return 'json' },
    send () { return 'send'}
  };

  it("permit only allows subdocuments when the path is explicit", function () {
    let myController = new Controller({ controller: 'myController', action: 'Get', url: '/widgets', body: body() }, res, client);
    myController.permit('user.name');
    assert.deepEqual(myController.body, {user : {name : 'Frank Larry'}});
  });

  it("permit only allows whitelisted keys", function () {
    let myController = new Controller({ controller: 'myController', action: 'Get', url: '/widgets', body: body() }, res, client);
    myController.permit('user.friend.user.name', 'bar');
    assert.deepEqual(myController.req.body, {user : {friend : {user : {name : 'Steve Jims'}}}, bar: 1 });
  });

  it("permit does not permit a sub document when the path is not explicit", function () {
    let myController = new Controller({ controller: 'myController', action: 'Get', url: '/widgets', body: body() }, res, client);
    let aBody = body();
    delete aBody.user;
    myController.permit('foo', 'bar', 'fox', 'stuff', 'user');
    assert.deepEqual(myController.req.body, aBody);
  });

  it("deepPermit permits a sub document when the path is not explicit", function () {
    let myController = new Controller({ controller: 'myController', action: 'Get', url: '/widgets', body: body() }, res, client);
    myController.deepPermit('foo', 'bar', 'fox', 'stuff', 'user');
    assert.deepEqual(myController.req.body, body());
  });

});