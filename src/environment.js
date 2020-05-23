// load .env into process.env.*
require('dotenv').config()

const environment = {
  port: process.env.PORT || 8050,
  hostname: process.env.HOSTNAME || 'localhost',
  publicname: process.env.PUBLICNAME || 'localhost',
}

module.exports = environment
