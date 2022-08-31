# mongooQ #

[![NPM](https://nodei.co/npm/mongooq.png?mini=true)](https://nodei.co/npm/mongooq/)

A really light-weight way to create queues with a nice API if you're already
using Mongoose.js.

**NOTE**: This package is considered feature complete and **STABLE** hence there is not a whole lot of development on
it though it is being used extensively. Use it with all your might and let us know of any problems - it should be
bullet-proof.

## Synopsis ##

Create a connection to your MongoDB database with Mongoose.js, and use it to create a queue object:

```js
const mongoose = require('mongoose')
const mongooQ = require('mongooq')

const url = 'mongodb://localhost:27017/'
const dbName = 'mongooQ'

const db = await mongoose.connect(url + dbName)
const queue = new mongooQ(db, 'default', { visibility: 86400 })
```

Add a message to a queue:

```js
const ids = await queue.add('Hello, World!')
// Message with payload 'Hello, World!' added.
// A list of id's are returned, useful for logging.
```

Get a message from the queue:

```js
const msg = await queue.get()
console.log('msg.id=' + msg.id)
console.log('msg.ack=' + msg.ack)
console.log('msg.payload=' + msg.payload) // 'Hello, World!'
console.log('msg.tries=' + msg.tries)
```

Ping a message to keep it's visibility open for long-running tasks

```js
const id = await queue.ping(msg.ack)
// Visibility window now increased for this message id.
// 'id' is returned, useful for logging.
```

Ack a message (and remove it from the queue):

```js
const id = await queue.ack(msg.ack)
// This msg removed from queue for this ack.
// The 'id' of the message is returned, useful for logging.
```

By default, all old messages - even processed ones - are left in MongoDB. This is so that
you can go and analyse them if you want. However, you can call the following function
to remove processed messages:

```js
const { deletedCount } = await queue.clean()
// All processed (ie. acked) messages have been deleted
// The result of the query is returned
```

## Creating a Queue ##

To create a queue, call the exported function with the `MongooseClient`, the name
and a set of opts. The MongoDB collection used is the same name as the name
passed in:

```js
const mongooQ = require('mongooq')

// an instance of a queue
const queue1 = await mongooQ(db, 'a-queue')
// another queue which uses the same collection as above
const queue2 = await mongooQ(db, 'a-queue')
```

Using `queue1` and `queue2` here won't interfere with each other and will play along nicely, but that's not a good idea code-wise - just use the same object. This example is for illustrative purposes only.

Note: Don't use the same queue name twice with different options, otherwise behaviour is undefined and again it's not something you should do.

To pass in options for the queue:

```js
const resizeQueue = await mongooQ(db, 'resize-queue', { visibility : 30, delay : 15 })
```

This example shows a queue with a message visibility of 30s and a delay to each message of 15s.

## Options ##

### name ###

This is the name of the MongoDB Collection you wish to use to store the messages.
Each queue you create will be it's own collection.

e.g.

```js
const resizeImageQueue = await mongooQ(db, 'resize-image-queue')
const notifyOwnerQueue = await mongooQ(db, 'notify-owner-queue')
```

This will create two collections in MongoDB called `resize-image-queue` and `notify-owner-queue`.

### visibility - Message Visibility Window ###

Default: `30`

By default, if you don't ack a message within the first 30s after receiving it,
it is placed back in the queue so it can be fetched again. This is called the
visibility window.

You may set this visibility window on a per queue basis. For example, to set the
visibility to 15 seconds:

```js
const queue = await mongooQ(db, 'queue', { visibility : 15 })
```

All messages in this queue now have a visibility window of 15s, instead of the
default 30s.

### delay - Delay Messages on Queue ###

Default: `0`

When a message is added to a queue, it is immediately available for retrieval.
However, there are times when you might like to delay messages coming off a queue.
ie. if you set delay to be `10`, then every message will only be available for
retrieval 10s after being added.

To delay all messages by 10 seconds, try this:

```js
const queue = await mongooQ(db, 'queue', { delay : 10 })
```

This is now the default for every message added to the queue.

### deadQueue - Dead Message Queue ###

Default: none

Messages that have been retried over `maxRetries` will be pushed to this queue so you can
automatically see problem messages.

Pass in a queue (that you created) onto which these messages will be pushed:

```js
const deadQueue = await mongooQ(db, 'deadQueue')
const queue = await mongooQ(db, 'queue', { deadQueue })
```

If you pop a message off the `queue` over `maxRetries` times and still have not acked it,
it will be pushed onto the `deadQueue` for you. This happens when you `.get()` (not when
you miss acking a message in it's visibility window). By doing it when you call `.get()`,
the unprocessed message will be received, pushed to the `deadQueue`, acked off the normal
queue and `.get()` will check for new messages prior to returning you one (or none).

### maxRetries - Maximum Retries per Message ###

Default: 5

This option only comes into effect if you pass in a `deadQueue` as shown above. What this
means is that if an item is popped off the queue `maxRetries` times (e.g. 5) and not acked,
it will be moved to this `deadQueue` the next time it is tried to pop off. You can poll your
`deadQueue` for dead messages much like you can poll your regular queues.

The payload of the messages in the dead queue are the entire messages returned when `.get()`ing
them from the original queue.

e.g.

Given this message:

```js
msg = {
  id: '533b1eb64ee78a57664cc76c',
  ack: 'c8a3cc585cbaaacf549d746d7db72f69',
  payload: 'Hello, World!',
  tries: 1
}
```

If it is not acked within the `maxRetries` times, then when you receive this same message
from the `deadQueue`, it may look like this:

```js
msg = {
  id: '533b1ecf3ca3a76b667671ef',
  ack: '73872b204e3f7be84050a1ce82c5c9c0',
  payload: {
    id: '533b1eb64ee78a57664cc76c',
    ack: 'c8a3cc585cbaaacf549d746d7db72f69',
    payload: 'Hello, World!',
    tries: 5
  },
  tries: 1
}
```

Notice that the payload from the `deadQueue` is exactly the same as the original message
when it was on the original queue (except with the number of tries set to 5).

## Operations ##

### .add() ###

You can add a string to the queue:

```js
const ids = await queue.add('Hello, World!')
// Message with payload 'Hello, World!' added.
// A list of id's is returned. Useful for logging.
```

Or add an object of your choosing:

```js
const ids = await queue.add({ err: 'E_BORKED', msg: 'Broken' })
// Message with payload { err: 'E_BORKED', msg: 'Broken' } added.
// 'id' is returned, useful for logging.
```

Or add multiple messages:

```js
const ids = await queue.add(['msg1', 'msg2', 'msg3'])
// Messages with payloads 'msg1', 'msg2' & 'msg3' added.
// All 'id's are returned as an array, useful for logging.
```

You can delay individual messages from being visible by passing the `delay` option:

```js
const ids = await queue.add('Later', { delay: 120 })
// Message with payload 'Later' added.
// 'id' is returned, useful for logging.
// This message won't be available for getting for 2 mins.
```

### .get() ###

Retrieve a message from the queue:

```js
const msg = await queue.get()
// You can now process the message
// IMPORTANT: The callback will not wait for an message if the queue is empty.  The message will be undefined if the queue is empty.
```

You can choose the visibility of an individual retrieved message by passing the `visibility` option:

```js
const msg = await queue.get({ visibility: 10 })
// You can now process the message for 10s before it goes back into the queue if not ack'd instead of the duration that is set on the queue in general
```

Message will have the following structure:

```js
{
  id: '533b1eb64ee78a57664cc76c', // ID of the message
  ack: 'c8a3cc585cbaaacf549d746d7db72f69', // ID for ack and ping operations
  payload: 'Hello, World!', // Payload passed when the message was addded
  tries: 1 // Number of times this message has been retrieved from queue without being ack'd
}
```

### .ack() ###

After you have received an item from a queue and processed it, you can delete it
by calling `.ack()` with the unique `ackId` returned:

```js
const msg = await queue.get()
const id = await queue.ack(msg.ack)
// this message has now been removed from the queue
```

### .ping() ###

After you have received an item from a queue and you are taking a while
to process it, you can `.ping()` the message to tell the queue that you are
still alive and continuing to process the message:

```js
const msg = await queue.get()
const id = await queue.ping(msg.ack)
// this message has had it's visibility window extended
```

You can also choose the visibility time that gets added by the ping operation by passing the `visibility` option:

```js
const msg = await queue.get()
const id = await queue.ping(msg.ack, { visibility: 10 })
// this message has had it's visibility window extended by 10s instead of the visibilty set on the queue in general
```

### .total() ###

Returns the total number of messages that has ever been in the queue, including
all current messages:

```js
const count = await queue.total()
console.log('This queue has seen %d messages', count)
```

### .size() ###

Returns the total number of messages that are waiting in the queue.

```js
const count = await queue.size()
console.log('This queue has %d current messages', count)
```

### .inFlight() ###

Returns the total number of messages that are currently in flight. ie. that
have been received but not yet acked:

```js
const count = await queue.inFlight()
console.log('A total of %d messages are currently being processed', count)
```

### .done() ###

Returns the total number of messages that have been processed correctly in the
queue:

```js
const count = await queue.done()
console.log('This queue has processed %d messages', count)
```

### .clean() ###

Deletes all processed mesages from the queue. Of course, you can leave these hanging around
if you wish, but delete them if you no longer need them. Perhaps do this using `setInterval`
for a regular cleaning:

```js
const { deletedCount } = await queue.clean()
console.log('%d processed messages have been deleted from the queue', deletedCount)
```

### Notes about Numbers ###

If you add up `.size() + .inFlight() + .done()` then you should get `.total()`
but this will only be approximate since these are different operations hitting the database
at slightly different times. Hence, a message or two might be counted twice or not at all
depending on message turnover at any one time. You should not rely on these numbers for
anything but are included as approximations at any point in time.

## Releases ##

### 0.0.1 (2022-08-31) ###

* [FIX] No longer getting schema error when using the same collection name with multiple queue's

### 0.0.0 (2022-08-30) ###

* [NEW] Ability to specify a visibility window when getting a message
* [NEW] Added .clean() method to remove old (processed) messages
* [NEW] Add 'delay' option to queue.add() so individual messages can be delayed separately
* [NEW] The msg.id is now returned on successful Queue.ping() and Queue.ack() calls
* [NEW] Ability to ping retrieved messages a. la. 'still alive' and 'extend visibility'
* [NEW] Return the message id when added to a queue
* [NEW] Ability to set a default delay on all messages in a queue
* [NEW] messages now return number of tries (times they have been fetched)
* [NEW] add messages to queues
* [NEW] fetch messages from queues
* [NEW] ack messages on queues
* [NEW] set up multiple queues
* [NEW] set your own MongoDB Collection name
* [NEW] set a visibility timeout on a queue

## Author ##

```
   ╒════════════════════════════════════════════════════╕
   │                                                    │
   │   Joshua D Phillips (Personal)                     │
   │   -------------------------                        │
   │                                                    │
   │          Email : phillips@joshuadarron.com         │
   │            Web : https://joshuadarron.com          │
   │        Twitter : https://twitter.com/joshuadarron  │
   │         GitHub : https://github.com/joshuadarron   │
   │                                                    │
   │                                                    │
   │   Node.js / npm                                    │
   │   -------------                                    │
   │                                                    │
   │      Profile : https://www.npmjs.com/~joshuadarron │
   │                                                    │
   ╘════════════════════════════════════════════════════╛
```

## License ##

This project is licensed under the [MIT License](../../LICENSE.md)

## Acknowledgments

  - Thank you to Andrew Chilton for inspiring this package, and allowing us to borrow some parts of npm/mongodb-queue
  - Big thanks to all that contributed, insperational or otherwise

(Ends)
