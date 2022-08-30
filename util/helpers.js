const crypto = require('crypto')

class Helpers {
    static now () {
        return Math.floor(Date.now() / 1000)
    }
    
    static id () {
        return crypto.randomBytes(16).toString('hex')
    }
    
    static async callout (promise) {
        return promise
            .then(res => [null, res])
            .catch(err => [err])
    }
}

module.exports = Helpers