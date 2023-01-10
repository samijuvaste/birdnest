require('dotenv').config()

const PORT = 8080
const MONGODB_URI = process.env.MONGODB_URI
const DRONES_URL = 'https://assignments.reaktor.com/birdnest/drones'
const PILOTS_URL = 'https://assignments.reaktor.com/birdnest/pilots/'

module.exports = {
    MONGODB_URI,
    PORT,
    DRONES_URL,
    PILOTS_URL
}