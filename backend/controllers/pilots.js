const pilotRouter = require('express').Router()
const Pilot = require('../models/pilot')

pilotRouter.get('/', async (request, response) => {
    const pilots = await Pilot.find({})
    response.json(pilots)
})

module.exports = pilotRouter