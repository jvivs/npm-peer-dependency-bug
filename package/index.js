var package = require('./package.json')
module.exports = {
  name: package.name,
  version: package.version,
  'primary-with-peer': require('primary-with-peer')
}
