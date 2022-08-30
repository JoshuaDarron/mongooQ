const assert = require('assert')
const mongooseQ = require('../')
// Test environment setup
const setup = require('./setup.js')
// Helpers
const { callout } = require('../util/helpers')

describe('Full walk through', async function () {
    // Reusable variables
    let client, queue, err, res

    before(async function () {
        client = await setup()
        queue = new mongooseQ(client, 'default', { visibility: 86400 })
    })

    after(function () {
        client.disconnect() // Disconnect from db
    })

    // Handle overall walkthrough
    describe('Complete walkthrough', function () {
        it('should successfully walk through the lifecycle of a single message', async function () {
            const payload = 'Hello, World!'
            // Run through adding a message
            ;[err, res] = await callout(queue.add(payload))
            assert.equal(err, null, 'Error is null')
            assert.equal(res.length, 1, 'Results are 1')
            assert.equal(res instanceof Array, true, 'Result is an instance of Array')
            // Get queue total
            ;[err, res] = await callout(queue.total())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres only one message')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'One message ready to be processed')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 0 message ready to be processed')
            // Run through getting a message
            ;[err, res] = await callout(queue.get())
            let msg = res
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof msg.id, 'string', 'Message id is a string')
            assert.equal(typeof msg.ack, 'string', 'Message ack is a string')
            assert.equal(msg.payload, payload)
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres one message being processed')
            // Run through pinging a message
            ;[err, res] = await callout(queue.ping(msg.ack))
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof res, 'string', 'Response is a message id string')
            // Start ackin a fool
            ;[err, res] = await callout(queue.ack(msg.ack))
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof res, 'string', 'Response is a message id string')
            // Get queue total
            ;[err, res] = await callout(queue.total())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres only one message')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'One message ready to be processed')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 0 message ready to be processed')
            // Get count of completed messages
            ;[err, res] = await callout(queue.done())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres 1 message processed')
            // Clean Queue
            ;[err, res] = await callout(queue.clean())
            assert.equal(err, null, 'Error is null')
            assert.equal(res.deletedCount, 1, 'Theres only one message')
            // Get queue total
            ;[err, res] = await callout(queue.total())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres only one message')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'One message ready to be processed')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 0 message ready to be processed')
            // Get count of completed messages
            ;[err, res] = await callout(queue.done())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 1 message processed')
        })

        it('should successfully walk through the lifecycle of muliple messages', async function () {
            const payload = [{ id: 'kAKz7S14ueQ' }, { id: 'polghtSu4OQ' }, { id: 'WUmPZ_Y79E0' }]
            // Run through adding a message
            ;[err, res] = await callout(queue.add(payload))
            assert.equal(err, null, 'Error is null')
            assert.equal(res.length, 3, 'Results are 3')
            assert.equal(res instanceof Array, true, 'Result is an instance of Array')
            // Get queue total
            ;[err, res] = await callout(queue.total())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 3, 'Theres three messages')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 3, 'Three messages ready to be processed')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 0 message ready to be processed')
            // Run through getting a message
            ;[err, res] = await callout(queue.get())
            let msg = res
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof msg.id, 'string', 'Message id is a string')
            assert.equal(typeof msg.ack, 'string', 'Message ack is a string')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres one message being processed')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 2, 'Two messages ready to be processed')
            // Run through pinging a message
            ;[err, res] = await callout(queue.ping(msg.ack))
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof res, 'string', 'Response is a message id string')
            // Start ackin a fool
            ;[err, res] = await callout(queue.ack(msg.ack))
            assert.equal(err, null, 'Error is null')
            assert.equal(typeof res, 'string', 'Response is a message id string')
            // Get queue total
            ;[err, res] = await callout(queue.total())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 3, 'Theres only one message')
            // Get queue size
            ;[err, res] = await callout(queue.size())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 2, 'One message ready to be processed')
            // Get count of all in progress
            ;[err, res] = await callout(queue.inFlight())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 0, 'Theres 0 message ready to be processed')
            // Get count of completed messages
            ;[err, res] = await callout(queue.done())
            assert.equal(err, null, 'Error is null')
            assert.equal(res, 1, 'Theres 1 message processed')
        })
    })
})
