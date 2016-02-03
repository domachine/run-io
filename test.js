'use strict';

const tap = require('tap');
const sinon = require('sinon');

const io = require('./index');

const lift = io.lift;
const liftMethod = io.liftMethod;

// Example:

function *heavyIO(req, res) {
  const user = yield lift(getUser)();
  const send = liftMethod(res, 'send', { sync: true });
  let articles;
  try {
    articles = yield lift(getUserArticles)(user._id);
  } catch (e) {
    yield send('Error fetching articles!');
    return;
  }
  yield send(articles);
}

function getUser(done) {
  // Implementation doesn't even matter for the test.
  const user = { _id: 3 };
  done(null, user);
}

function getUserArticles(u, done) {
  // Implementation doesn't even matter for the test.
  const articles = [{ title: 'foo' }];
  done(null, articles);
}

const req = {};
const res = { send: () => {} }; // eslint-disable-line

// Just fun to test. No database setup needed.
tap.test('test success example', (t) => {
  const user = { _id: 3 };
  const articles = [{ title: 'foo' }];
  const it = heavyIO(req, res);
  const send = liftMethod(res, 'send', { sync: true });
  t.deepEqual(it.next().value, lift(getUser)());
  t.deepEqual(it.next(user).value, lift(getUserArticles)(user._id));
  t.deepEqual(it.next(articles).value, send(articles));
  t.end();
});

tap.test('test failure example', (t) => {
  const user = { _id: 3 };
  const it = heavyIO(req, res);
  const send = liftMethod(res, 'send', { sync: true });
  t.deepEqual(it.next().value, lift(getUser)());
  t.deepEqual(it.next(user).value, lift(getUserArticles)(user._id));
  t.deepEqual(
    it.throw(new Error('foo')).value,
    send('Error fetching articles!')
  );
  t.end();
});

// Run

tap.test('run() with success example', (t) => {
  t.plan(6);
  const arg = {};
  const async1 = sinon.stub().callsArgWith(2, null, 'test string');
  const async2 = sinon.stub().callsArgWith(1, null, 'test string 2');
  const sync1 = sinon.stub().returns(42);

  function *it(arg1) {
    t.equal(arg1, arg);
    const a = yield lift(async1)(1, 2);
    const b = yield lift(async2)(5);
    const c = yield lift(sync1, { sync: true })();
    t.equal(a, 'test string');
    t.equal(b, 'test string 2');
    t.equal(c, 42);
    return 10;
  }

  io.run(it, next)(arg);

  function next(err, value) {
    t.equal(err == null, true);
    t.equal(value, 10);
    t.end();
  }
});

tap.test('run() with failure example', (t) => {
  t.plan(3);
  const arg = {};
  const async1 = sinon.stub().callsArgWith(2, 'foo');
  const async2 = sinon.stub().callsArgWith(1, 'foo 2');
  const sync1 = sinon.stub().returns(42);

  function *it(arg1) {
    t.equal(arg1, arg);
    try {
      yield lift(async1)(1, 2);
    } catch (e) {
      t.equal(e, 'foo');
    }
    yield lift(async2)(5);

    // This should not be reached
    t.equal(true, false);
    yield lift(sync1, { sync: true })();
  }

  io.run(it, next)(arg);

  function next(err) {
    t.equal(err, 'foo 2');
    t.end();
  }
});

tap.test('run() with sync failure example', (t) => {
  t.plan(2);
  const arg = {};
  const sync1 = sinon.stub().throws('error', 'foo 2');

  function *it(arg1) {
    t.equal(arg1, arg);
    yield lift(sync1, { sync: true })();

    // This should not be reached
    t.equal(true, false);
  }

  io.run(it, next)(arg);

  function next(err) {
    t.equal(err.message, 'foo 2');
    t.end();
  }
});

tap.test('sync liftMethod()', (t) => {
  t.plan(1);
  const obj = {
    meth() {
      return 'test';
    },
  };

  const m = io.liftMethod(obj, 'meth', { sync: true })();
  const mCopy = io.liftMethod(obj, 'meth')();
  mCopy.opts.sync = true;
  t.deepEqual(m, mCopy);
  t.end();
});

// run(heavyIO, end)(req, res);
//
// function end(err) {
//   if (err) {
//     console.log('Something went wrong', err.stack);
//   }
// }
