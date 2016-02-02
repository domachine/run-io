# run-io

A monadic abstraction to encapsulate functions with side-effects.  The single target of this
super-tiny library is to ease testing of side-effect based code.

## Installation

    $ npm i run-io

## Usage

```js
const io = require('run-io');

const lift = io.lift;
const liftMethod = io.liftMethod;
const run = io.run;

const getUser = () => {
  // Stuff ...
};

const getUserArticles = () => {
  // Stuff ...
};

/**
 * Some http handler which performs heavy IO.
 */
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

/**
 * A smoke test for the handler. Notice how we don't even need an
 * implementation of the `getUser()` and `getUserArticles()` methods.
 */
function test() {
  const req = {};
  const res = { send: () => {} }; // eslint-disable-line

  // Just fun to test. No database setup needed.
  const user = { _id: 3 };
  const articles = [{ title: 'foo' }];
  const send = liftMethod(res, 'send', { sync: true });

  const it = heavyIO(req, res);
  t.deepEqual(it.next().value, lift(getUser)());
  t.deepEqual(it.next(user).value, lift(getUserArticles)(user._id));
  t.deepEqual(it.next(articles).value, send(articles));
}

test();

// Run the handler.
http.createServer(run(heavyIO, error));

function error() {
  // Error handling ...
}
```
