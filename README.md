# run-io

[![Build Status](https://travis-ci.org/domachine/run-io.svg?branch=master)](https://travis-ci.org/domachine/run-io)
[![Coverage Status](https://coveralls.io/repos/github/domachine/run-io/badge.svg?branch=master)](https://coveralls.io/github/domachine/run-io?branch=master)

A monadic abstraction to encapsulate functions with side-effects.  The single target of this
super-tiny library is to ease testing of side-effect based code.

## Installation

    $ npm i run-io

## API

### lift(fn, [opts])

Turns `fn` into a `yield`able function. `opts` is optional and can have the following keys:

  * `sync` - Handles this function synchronously

### liftMethod(object, method, [opts])

Turns a object method into a `yield`able function. `opts` is the same as in `lift()`.

*Example*

```js
liftMethod(Model, 'find');
```

### run(generatorFunction, done)

Generates a function, which can be called with arguments that get passed to the `generatorFunction`.
If called this function executes the effects, `yield`ed by the generator function.

*Example*

```js
function *gen(req, res) {
  const send = liftMethod(res, 'send', { sync: true });
  yield send({ ok: true });
}

function done(err) {
  if (err) throw err;
  console.log('done');
}

http.createServer(run(gen, done));
```

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
