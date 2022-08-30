const crypto = require('crypto')

class Helpers {
    /**
     * Get's the current time in a uniz timestamp
     *
     * @return {number} Unix timestamp
     *
     * @example
     *
     *     now()
     */
    static now () {
        return Math.floor(Date.now() / 1000)
    }
    /**
     * Create's a randomly generated id
     *
     * @return {string} Newly created id string
     *
     * @example
     *
     *     id()
     */
    static id () {
        return crypto.randomBytes(16).toString('hex')
    }
    /**
     * For better error handling while using async
     *
     * @return {[any]} 
     * Index 1: Error if exists 
     * Index 2: Result if promise successful
     *
     * @example
     *
     *     const [err, res] = await callout(promise())
     */
    static async callout (promise) {
        return promise
            .then(res => [null, res])
            .catch(err => [err])
    }
}

module.exports = Helpers
