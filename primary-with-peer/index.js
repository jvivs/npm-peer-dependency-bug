var package = require('./package.json')
module.exports = {
  name: package.name,
  version: package.version,
  peer: require('peer')
}
