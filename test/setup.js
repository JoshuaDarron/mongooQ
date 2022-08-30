const mongoose = require('mongoose')

const url = 'mongodb://localhost:27017/'
const dbName = 'mongooseQ-test'

module.exports = async function () {
	return mongoose.connect(url + dbName)
}
