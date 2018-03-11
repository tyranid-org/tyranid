"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const mongodb = require("mongodb");
const express = require("express");
const tyranid_1 = require("../src/tyranid");
const model_1 = require("./model");
const expressPort = 5000;
async function server() {
    try {
        const db = await mongodb.MongoClient.connect('mongodb://localhost:27017/tyranid_test');
        tyranid_1.default.config({
            db: db,
            consoleLogLevel: 'ERROR',
            dbLogLevel: 'TRACE',
            //indexes: true,
            validate: { glob: __dirname + '/models/**/*.js' }
        });
        await model_1.default();
        const loggedInUser = await tyranid_1.default.byName.user.byId(1);
        const app = express();
        tyranid_1.default.express(app, (req, res, next) => {
            req.user = loggedInUser; // "log in" user
            return next();
        });
        app.use(express.static(path.join(__dirname, 'public')));
        app.listen(expressPort, () => console.log('Express listening on port ' + expressPort));
    }
    catch (err) {
        console.error(err);
    }
}
exports.default = server;
//# sourceMappingURL=server.js.map