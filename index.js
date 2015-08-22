/**
 * register babel and expose tyranid
 */
require('babel/register');
module.exports = require('./src/tyranid.js');
