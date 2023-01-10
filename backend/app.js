const config = require('./utils/config')
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.set('strictQuery', false)
require('express-async-errors')
const axios = require('axios')
const cheerio = require('cheerio')
//const { default: PQueue } = require('p-queue')

const pilotRouter = require('./controllers/pilots')
const logger = require('./utils/logger')

logger.info('connecting to', config.MONGODB_URI)
mongoose.connect(config.MONGODB_URI)
    .then(() => {
        logger.info('connected to mongodb')
    })
    .catch(error => {
        logger.error('error connecting to mongodb', error.message)
    })


app.use(cors())
app.use(express.json())

app.use('/api/pilots', pilotRouter)
const Pilot = require('./models/pilot')

//request queue that limits the amount of queries to 90 / min
//to avoid making too many requests fast (429)
/*const requestQueue = new PQueue({
    concurrency: 1,
    interval: 60000,
    intervalCap: 90
})*/

const calculateDistance = drone => {
    const xDiff = 250000 - drone.position[0]
    const yDiff = 250000 - drone.position[1]
    const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff)
    drone.distance = Math.floor(distance / 1000)
}

const updatePilots = async () => {
    /*
    const response = await requestQueue.add(
        () => axios(config.DRONES_URL),
        { priority: 1 } //requests for drones are scheduled first
    )
    logger.info(response.headers.get('x-ratelimit-remaining'))
    */
    const response = await axios(config.DRONES_URL)
    const $ = cheerio.load(response.data, {
        xmlMode: true
    })
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
        if (oldPilot) { //if has been seen before it is updated
            const shorterDistance = drone.distance < oldPilot.distance
                ? drone.distance
                : oldPilot.distance

            const updates = {
                distance: shorterDistance,
                createdAt: new Date()
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
                /*
                const response = await requestQueue.add(() =>
                    axios(config.PILOTS_URL + drone.serialNumber))
                logger.info(response.headers.get('x-ratelimit-remaining'))
                */
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
                    savePilot({
                        name: 'No pilot information found',
                        email: '-',
                        phoneNumber: '-',
                        distance: drone.distance,
                        droneNumber: drone.serialNumber
                    })
                }
            }
        }
    }
}

setInterval(() => {
    try {
        updatePilots()
    } catch (error) {
        if (error.response.status === 429) {
            setTimeout(logger.error('Too many requests!'), 1000)
        }
    }
}, 2000)

module.exports = app