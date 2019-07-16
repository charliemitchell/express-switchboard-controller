module.exports = function asPromise(fn) {
  return new Promise((resolve, reject) => {
    const args = [...arguments].slice(1);
    args.push((err, res) => {
      if (err) return reject(err);
      resolve(res);
    });
    fn.apply(null, args);
  });
}
