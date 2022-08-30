const { now, id } = require('./util/helpers')

class Queue {
    constructor(mongoose, name, opts = {}) {
        // Check for values
        if (!mongoose) throw new Error('mongooseQ: provide a mongoose client')
        if (!name) throw new Error('mongooseQ: provide a queue name')
        // Create the model for the message
        this.Model = mongoose.model(name, new mongoose.Schema({
            ack: String,
            visible: { // Unix timestamp representing current visibility
                type: Number,
                required: true
            },
            payload: {
                type: mongoose.Schema.Types.Mixed,
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
        }))
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
     * This function inserts messages into the queue
     *
     * @param {any} payload - Anything you'd like to store
     * @param {object} opts - Queue options
     * @return {any} New message ID string or a list of strings
     *
     * @example
     *
     *     add('Hello World!', {  })
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
     * This function inserts messages into the queue
     *
     * @param {any} payload - Anything you'd like to store
     * @param {object} opts - Queue options
     * @return {any} New message ID string or a list of strings
     *
     * @example
     *
     *     add('Hello World!', {  })
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

    async ping(ack, opts = {}) {
        const visibility = opts.visibility || Queue.visibility
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
        const res = await Queue.model.findOneAndUpdate(where, update, { returnOriginal: false })
        if (!res) throw new Error('Queue.ping(): Unidentified ack  : ' + ack)
        return '' + res._id
    }

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
        const res = await Queue.model.findOneAndUpdate(where, update, { returnOriginal: false })
        if (!res) throw new Error('Queue.ack(): Unidentified ack : ' + ack)
        return '' + res._id
    }

    async index() {
        const index = await Queue.model.index({ deleted: 1, visible: 1 })
        await Queue.model.createIndex({ ack: 1 }, { unique: true, sparse: true })
        return index
    }

    async clean() {
        return Queue.model.deleteMany({ done: true })
    }

    async total() {
        return Queue.model.countDocuments()
    }

    async size() {
        const where = {
            done: false,
            visible: { $lte: now() },
        }
        return Queue.model.countDocuments(where)
    }

    async inFlight() {
        const where = {
            ack: { $exists: true },
            visible: { $gt: now() },
            done: false
        }
        return Queue.model.countDocuments(where)
    }

    async done() {
        return Queue.model.countDocuments({ done: true })
    }
}

module.exports = Queue

