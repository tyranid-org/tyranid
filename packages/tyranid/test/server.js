import * as path from 'path';
import * as mongodb from 'mongodb';
import * as express from 'express';
import Tyr from '../src/tyranid';

import initModel from './model';

const expressPort = 5000;

export default async function server() {
  try {
    const db = await mongodb.MongoClient.connect(
      'mongodb://localhost:27017/tyranid_test'
    );
    Tyr.config({
      db: db,
      consoleLogLevel: 'ERROR',
      dbLogLevel: 'TRACE',
      //indexes: true,
      validate: { glob: __dirname + '/models/**/*.js' }
    });

    await initModel();

    const loggedInUser = await Tyr.byName.user.byId(1);

    const app = express();

    Tyr.express(app, (req, res, next) => {
      req.user = loggedInUser; // "log in" user
      return next();
    });

    app.use(express.static(path.join(__dirname, 'public')));

    app.listen(expressPort, () =>
      console.log('Express listening on port ' + expressPort)
    );
  } catch (err) {
    console.error(err);
  }
}
