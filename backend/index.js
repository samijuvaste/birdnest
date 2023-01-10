const app = require('./app')
const http = require('http')
const logger = require('./utils/logger')

const server = http.createServer(app)

const PORT = 8080
server.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`)
})