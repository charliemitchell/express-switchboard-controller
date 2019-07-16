require('rooty')();
const assert = require('chai').assert;
const asPromise = require('../function-as-promise');

describe('function-as-promise', function () {

  it("rejects the promise when the first argument is present", function () {
    let myPromise = asPromise(function (fn) { fn (true, null) });
    return new Promise( (resolve, reject) => {
      myPromise.then(reject).catch(resolve)
    })
  });

  it("does not reject promise when the first argument is not present", function () {
    let myPromise = asPromise(function (fn) { fn (null, true) });
    return new Promise( (resolve, reject) => {
      myPromise.then(resolve).catch(reject)
    })
  });

});