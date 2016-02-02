'use strict';

exports.lift = lift;
exports.liftMethod = liftMethod;
exports.run = run;

// Simple goal is to push out side-effects for testability
function liftMethod(ctx, method, opts) {
  return lift(ctx[method], Object.assign({ ctx }, opts || {}));
}

function lift(fn, opts) {
  const saneOpts = opts || { sync: false };
  const ctx = saneOpts.ctx;
  return function() {
    return { fn, ctx, opts: saneOpts, args: [].slice.call(arguments) };
  };
}

function run(it, done) {
  return function() {
    runIO(it.apply(this, arguments), {}, done);
  };
}

// Takes an iterator and runs its instructions.
function runIO(it, param, done) {
  let value;
  try {
    value = param.err
      ? it.throw(param.err)
      : it.next(param.res);
  } catch (e) {
    return done(e);
  }

  if (value.done) return done(value.value);
  runEffect(value.value, next);

  function next(err, res) {
    runIO(it, { err, res }, done);
  }
}

function runEffect(effect, next) {
  if (effect.opts.sync) {
    // Run synchronous effect
    try {
      const ret = effect.fn.apply(effect.ctx, effect.args);
      next(null, ret);
    } catch (e) {
      next(e);
    }
  } else {
    // Run asynchronous effect
    effect.fn.apply(effect.ctx, effect.args.concat(next));
  }
}
