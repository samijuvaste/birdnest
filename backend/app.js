const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
require('express-async-errors')
const axios = require('axios')
const cheerio = require('cheerio')

const pilotRouter = require('./controllers/pilots')
const logger = require('./utils/logger')

//connects to MongoDB database
logger.info('connecting to', config.MONGODB_URI)
mongoose.connect(config.MONGODB_URI)
    .then(() => {
        logger.info('connected to mongodb')
    })
    .catch(error => {
        logger.error('error connecting to mongodb', error.message)
    })


app.use(cors())
app.use(express.static('build'))
app.use(express.json())

app.use('/api/pilots', pilotRouter)
const Pilot = require('./models/pilot')

const calculateDistance = drone => {
    const xDiff = 250000 - drone.position[0]
    const yDiff = 250000 - drone.position[1]
    const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff)
    drone.distance = Math.floor(distance / 1000)
}

const updatePilots = async () => {
    try {
        //requests for drone data
        const response = await axios(config.DRONES_URL)
        const $ = cheerio.load(response.data, { //cheerio loads xml data
            xmlMode: true
        })
        //with cheerio the xml data is transformed to an array of drone objects
        const drones = $('drone').toArray().map(drone => {
            return {
                serialNumber: $(drone).children('serialNumber').text(),
                position: [
                    Number($(drone).children('positionX').text()),
                    Number($(drone).children('positionY').text())
                ]
            }
        })
        drones.forEach(calculateDistance)
        const violatingDrones = drones.filter(drone =>
            drone.distance < 100
        )

        for (const drone of violatingDrones) {
            //queries the dabase if that drone has violated before
            const oldPilot = await Pilot.findOne({ droneNumber: drone.serialNumber })
            if (oldPilot) { //if the pilot has been seen before it is updated
                const shorterDistance = drone.distance < oldPilot.distance
                    ? drone.distance
                    : oldPilot.distance

                const updates = {
                    distance: shorterDistance,
                    createdAt: Date.now()
                }

                const updatedPilot = await Pilot.findOneAndUpdate(
                    { droneNumber: drone.serialNumber },
                    updates,
                    { new: true }
                )
                logger.info('updated pilot:', updatedPilot)

            } else {

                //function that saves given new pilot to database
                const savePilot = async pilot => {
                    const newPilot = new Pilot({
                        name: pilot.name,
                        email: pilot.email,
                        phoneNumber: pilot.phoneNumber,
                        distance: pilot.distance,
                        droneNumber: pilot.droneNumber
                    })
                    const savedPilot = await newPilot.save()
                    logger.info('added pilot:', savedPilot)
                }

                try {
                    //requests for violating pilot's data
                    const response = await axios(config.PILOTS_URL + drone.serialNumber)
                    const pilot = response.data
                    savePilot({
                        name: `${pilot.firstName} ${pilot.lastName}`,
                        email: pilot.email,
                        phoneNumber: pilot.phoneNumber,
                        distance: drone.distance,
                        droneNumber: drone.serialNumber
                    })
                } catch (error) {
                    if (error.response.status === 404) {
                        //for the rare occasion where pilot information is not found
                        savePilot({
                            name: 'No pilot information found',
                            email: '-',
                            phoneNumber: '-',
                            distance: drone.distance,
                            droneNumber: drone.serialNumber
                        })
                    } else throw error
                }
            }
        }
    } catch (error) {
        if (error.response.status === 429) {
            logger.error('There were too many requests!')
        }
    }
}
//makes the requests every two seconds
setInterval(updatePilots, 2000)

module.exports = app