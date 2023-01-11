const mongoose = require('mongoose')

const pilotSchema = new mongoose.Schema({
    name: String,
    email: String,
    phoneNumber: String,
    distance: Number,
    droneNumber: String,
    createdAt: {
        type: Date,
        default: Date.now()
    }
})

//makes id a string and removes version
pilotSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString()
        delete returnedObject._id
        delete returnedObject.__v
    }
})

//mongodb database removes pilots that haven't been seen in 10 min
pilotSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 })

module.exports = mongoose.model('Pilot', pilotSchema)