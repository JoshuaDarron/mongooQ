const mongoose = require('mongoose')
// Connection strings
const url = 'mongodb://localhost:27017/'
const dbName = 'mongoosejsQTest'

module.exports = async function () {
	const db = await mongoose.connect(url + dbName)
	db.connection.db.dropDatabase()
	return db
}
