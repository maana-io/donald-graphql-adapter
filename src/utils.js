// --- External imports
const { log } = require('io.maana.shared')

// --- Internal imports
const pkg = require('../package')

// --- Environment variables

const SELF = `${pkg.name}:${pkg.version}`

// --- Functions
export const compose = (...funcs) => (initialArg) =>
  funcs.reduce((acc, func) => func(acc), initialArg)

// --- Exports

module.exports = {
  SELF,
  log: log(SELF),
}
