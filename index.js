/**
 * 
 * @fileOverview This file is where we house the queue class
 * @author Joshua D Phillips
 * 
 */
const { now, id } = require('./util/helpers')

/** Class representing a queue */
class Queue {
    /**
     * Create a queue
     * @param {object} db - Mongoose client
     * @param {number} name - Message collection name
     * @param {object} [opts] - Options for queue setup
     */
    constructor(db, name, opts = {}) {
        // Confirm we have a database client and a name
        if (!db) throw new Error('mongooseQ: provide a mongoose client')
        if (!name) throw new Error('mongooseQ: provide a queue name')
        // Message Model
        const schemaModel = new db.Schema({
            ack: String,
            visible: { // Unix timestamp representing current visibility
                type: Number,
                required: true
            },
            payload: {
                type: db.Schema.Types.Mixed,
                required: true
            },
            done: { // Unix timestamp representing completion time
                type: Boolean,
                default: false,
                required: true
            },
            tries: { // Number representing total attempts
                type: Number,
                default: 0,
                required: true
            }
        }, {
            timestamps: true
        })
        // Index at schema level
        schemaModel.index({ done: 1, visible: 1 })
        schemaModel.index({ ack: 1 }, { unique: true, sparse: true })
        // Instantiate the message model
        this.Model = db.model(name, schemaModel)
        // Handle the options passed through
        this.visibility = opts.visibility || 30
        this.delay = opts.delay || 0
        // Handle deadQueue items
        if (opts.deadQueue) {
            this.deadQueue = opts.deadQueue
            this.maxRetries = opts.maxRetries || 5
        }
    }
    /**
     * Inserts messages
     *
     * @param {any} payload - Anything you'd like to store
     * @param {object} opts - Queue options
     * @return {any} New message ID string or a list of strings
     *
     * @example
     *
     *     await add('Hello World!', { delay: 120 })
     */
    async add(payload, opts = {}) {
        const delay = opts.delay || this.delay
        const visible = delay ? now() + delay : now()
        const msgs = []
        if (payload instanceof Array) { // Handle array's
            if (payload.length === 0) throw new Error('Queue.add(): Array payload length must be greater than 0')
            payload.forEach(function (payload) {
                msgs.push({ visible, payload })
            })
        } else { // Handle everything else
            msgs.push({ visible, payload })
        }
        // Insert the list into the db
        const res = await this.Model.create(msgs)
        return res.map(r => r._id)
    }
    /**
     * Fetches messages
     *
     * @return {object} Single message
     *
     * @example
     *
     *     await get()
     */
    async get(opts = {}) {
        const visibility = opts.visibility || this.visibility
        const where = {
            done: false,
            visible: { $lte: now() } // Less than or Equal to
        }
        const sort = {
            createdAt: 1 // First in, First out
        }
        const ack = id()
        const update = {
            $inc: { tries: 1 },
            $set: {
                ack,
                visible: now() + visibility,
            }
        }
        // Fetch and Update a message
        const res = await this.Model.findOneAndUpdate(where, update, { sort, returnOriginal: false })
        if (!res) return null
        // convert to an external representation
        const msg = { 
            id: '' + res._id, // convert '_id' to an 'id' string
            payload: res.payload,
            ack: res.ack,
            visible: res.visible,
            done: res.done,
            tries: res.tries,
            createdAt: res.createdAt,
            updatedAt: res.updatedAt
        }
        // if we have a deadQueue, then check the tries, else don't
        if (this.deadQueue) {
            // check the tries
            if (msg.tries > this.maxRetries) {
                // So:
                // 1) add this message to the deadQueue
                // 2) ack this message from the regular queue
                // 3) call ourself to return a new message (if exists)
                await this.deadQueue.add(msg)
                await this.ack(msg.ack)
                return this.get(opts)
            }
        }
        return msg
    }
    /**
     * Add's more time to work with messages
     *
     * @param {string} ack - Message ack you'd like to ping
     * @param {object} opts - Queue options
     * @return {string} Ping'd message id
     *
     * @example
     *
     *     await ping('630d7f6535b2f89114daa238', { visibility: 120 })
     */
    async ping(ack, opts = {}) {
        const visibility = opts.visibility || this.visibility
        const where = {
            ack,
            visible: { $gt: now() }, // Greater than
            done: false
        }
        const update = {
            $set: {
                visible: now() + visibility
            }
        }
        const res = await this.Model.findOneAndUpdate(where, update, { returnOriginal: false })
        if (!res) throw new Error('Queue.ping(): Unidentified ack  : ' + ack)
        return '' + res._id
    }
    /**
     * Mark's a message as done
     *
     * @param {string} ack - Message ack you'd like to complete
     * @return {string} Ack'd message id
     *
     * @example
     *
     *     await ack('630d7f6535b2f89114daa238')
     */
    async ack(ack) {
        const where = {
            ack,
            visible: { $gt: now() }, // Making sure this message is in progress
            done: false
        }
        const update = {
            $set: {
                done: true
            }
        }
        const res = await this.Model.findOneAndUpdate(where, update, { returnOriginal: false })
        if (!res) throw new Error('Queue.ack(): Unidentified ack : ' + ack)
        return '' + res._id
    }
    /**
     * Removes all messages marked done
     *
     * @return {object} Deletion result
     *
     * @example
     *
     *     clean()
     */
    async clean() {
        return this.Model.deleteMany({ done: true })
    }
    /**
     * Counts total messages
     *
     * @return {number} Count of all messages
     *
     * @example
     *
     *     await total()
     */
    async total() {
        return this.Model.countDocuments()
    }
    /**
     * Counts total incomplete messages
     *
     * @return {number} Size of the queue
     *
     * @example
     *
     *     await size()
     */
    async size() {
        const where = {
            done: false,
            visible: { $lte: now() },
        }
        return this.Model.countDocuments(where)
    }
    /**
     * Counts total messages in progress
     *
     * @return {number} Total messages being worked on
     *
     * @example
     *
     *     await inFlight()
     */
    async inFlight() {
        const where = {
            ack: { $exists: true },
            visible: { $gt: now() },
            done: false
        }
        return this.Model.countDocuments(where)
    }
    /**
     * Counts total messages marked done
     *
     * @return {number} Total messages completed
     *
     * @example
     *
     *     await done()
     */
    async done() {
        return this.Model.countDocuments({ done: true })
    }
}

module.exports = Queue
