const assert = require('assert')

const setup = require('./setup.js')
const { callout } = require('../util/helpers')

const mongooseQ = require('../')

describe('Full walk through', async function () {
    // Reusable variables
    let client, err, res

    before(async function () {
        client = await setup()
    })

    after(function () {
        client.disconnect() // Disconnect from db
    })

    // Handle overall walkthrough
    describe('#get()', function () {
        it('should return new message id or id\'s', async function () {
            const queue = new mongooseQ(client, 'default', { visibility: 86400 })
            const payload = 'Hello, World!';
            // Run through adding a message
            [err, res] = await callout(queue.add(payload))
            assert.equal(err, null, 'Error is null')
            assert.equal(res.length, 1, 'Results are 1')
            assert.equal(res instanceof Array, true, 'Result is an instance of Array');
            // Run through getting a message
            [err, res] = await callout(queue.get())
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof res.id, 'string', 'Message id is a string')
            assert.equal(typeof msg.ack, 'string', 'msg.ack is a string')
            assert.equal(res instanceof Array, true)
            // expect(res instanceof Array).to.be.truesMsg
            //     t.ok(msg.id, 'Got a msg.id')
            //     t.equal(typeof msg.id, 'string', 'msg.id is a string')
            //     t.ok(msg.ack, 'Got a msg.ack')
            //     t.equal(typeof msg.ack, 'string', 'msg.ack is a string')
            //     t.ok(msg.tries, 'Got a msg.tries')
            //     t.equal(typeof msg.tries, 'number', 'msg.tries is a number')
            //     t.equal(msg.tries, 1, 'msg.tries is currently one')
            //     t.equal(msg.payload, 'Hello, World!', 'Payload is correct')
        })
    })
})
