import * as bodyParser from 'body-parser';
import * as chai from 'chai';
import * as connectMongo from 'connect-mongo';
import * as express from 'express';
import * as session from 'express-session';
import * as _ from 'lodash';
import * as mongodb from 'mongodb';
import * as fetch from 'node-fetch';
import * as puppeteer from 'puppeteer';

import { Tyr } from '../src/tyranid';

const { ObjectID } = mongodb;

const { expect, assert } = chai;

const expressPort = 6783; // "random" #

export function add() {
  describe('express', () => {
    const urlPrefix = 'http://localhost:' + expressPort;

    let Location: Tyr.LocationCollection,
      User: Tyr.UserCollection,
      Subscription: Tyr.TyrSubscriptionCollection,
      app: express.Application;

    before(async () => {
      Location = Tyr.byName.location;
      User = Tyr.byName.user;
      Subscription = Tyr.byName.tyrSubscription;

      app = express();

      const MongoStore = connectMongo(session);
      const store = new MongoStore({
        url: 'mongodb://localhost:27017/tyranid_test',
        stringify: false
      });

      const COOKIE_SECRET = 'tyranid-test-secret';

      const sessionHandler = session({
        secret: COOKIE_SECRET,
        resave: false,
        rolling: true,
        saveUninitialized: true,
        store
      });

      Tyr.connect({ store });

      const user = await User.byId(1);

      app.use((req, res, next) => sessionHandler(req, res, next));

      app.use((req, res, next) => {
        if (req.session) {
          req.session.passport = { user: user!._id }; // "log in" user 1
        }

        return next();
      });

      app.use(bodyParser.json());

      Tyr.connect({
        app,
        auth: (req, res, next) => {
          (req as any).user = user; // "log in" user 1
          return next();
        }
      });

      await new Promise((resolve, reject) => {
        const http = app.listen(expressPort, () => {
          // console.log('Express listening on port ' + expressPort)
          resolve();
        });

        Tyr.connect({ http });
      });
    });

    it('should 200 when accessing /api/tyranid', async () => {
      const result = await fetch(urlPrefix + '/api/tyranid');
      expect(result.status).to.eql(200);
    });

    it('should 404 when doc not found on /api/NAME/:id', async () => {
      const result = await fetch(urlPrefix + '/api/user/999998');
      expect(result.status).to.eql(404);
    });

    it('should 404 when doc not found on /api/NAME/:id/FIELD_PATH/slice', async () => {
      const result = await fetch(urlPrefix + '/api/user/999998/siblings/slice');
      expect(result.status).to.eql(404);
    });

    it('should not expose /custom route on non-express collections', async () => {
      const result = await fetch(urlPrefix + '/api/role/custom');
      expect(result.status).to.eql(404);
    });

    it('should expose socket.io', async () => {
      const result = await fetch(urlPrefix + '/socket.io/socket.io.js');
      expect(result.status).to.eql(200);
    });

    it('should support fields', async () => {
      let result = await fetch(urlPrefix + '/api/user/custom', {
        method: 'put',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organization: 1 })
      });
      let json = await result.json();
      expect(_.keys(json.fields)).to.eql(['acmeY', 'custom']);

      // should also merge nested fields
      expect(_.keys(json.fields.custom.fields)).to.eql(['nested1', 'nested2']);

      expect(json.fields.custom.fields.nested1.label).to.eql('Nested 1');

      result = await fetch(urlPrefix + '/api/organization/custom', {
        method: 'put',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ foo: 1 })
      });

      json = await result.json();
      expect(_.keys(json.fields)).to.eql([]);
    });

    describe('browser', () => {
      let browser: puppeteer.Browser, page: puppeteer.Page;

      before(async () => {
        app.route('/test/page').get(async (req, res) => {
          // TODO:  return a copy copy of jQuery and lodash from devDependencies instead of getting it from the network
          res.send(`
<html>
  <head>
    <script src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/3.10.0/lodash.min.js"></script>
    <script src="/socket.io/socket.io.js"></script>
    <script src="/api/tyranid"></script>
    <script>
      Tyr.init();
      Tyr.setSocketLibrary(io);
    </script>
  </head>
  <body>
    Tyranid Test Page
  </body>
</html>`);
        });

        // --no-sandbox needed for travis
        browser = await puppeteer.launch({ args: ['--no-sandbox'] });
        // .launch({ headless: false, devtools: true });
        // .launch({ headless: false, slowMo: 10000 });
        page = await loadTestPage();
      });

      after(() => browser.close());

      const loadTestPage = async () => {
        const page = await browser.newPage();
        /*const response = */ await page.goto(
          `http://localhost:${expressPort}/test/page`
        );
        // page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));

        return page;
      };

      it('should have access to a client Tyr object', async () =>
        expect(
          await page.evaluate('Tyr.byName.tyrLogLevel.values[0].name')
        ).to.eql('trace'));

      it('Tyr.byName.X and Tyr.collections.X should be equivalent', async () => {
        expect(
          await page.evaluate(
            'Tyr.byName.tyrLogLevel === Tyr.collections.TyrLogLevel'
          )
        ).to.eql(true);
      });

      it('should support subscriptions', async () => {
        const cleanup = () =>
          Promise.all([
            Location.remove({ query: {} }),
            Subscription.remove({ query: {} })
          ]);

        await cleanup();

        try {
          await page.evaluate(`
const Location = Tyr.byName.location;
Location.subscribe({});
window._gotEvent = false;
Location.on({ type: 'change', handler(event) { window._gotEvent = true; } });`);

          await Tyr.sleepUntil(async () =>
            Subscription.exists({
              query: { u: 1, c: Location.id }
            })
          );

          await Location.save({ name: 'Yosemite Valley' });

          await Tyr.sleepUntil(async () =>
            page.evaluate(
              'Tyr.byName.location.values.length === 1 && window._gotEvent'
            )
          );
        } finally {
          await cleanup();
        }
      });
    });
  });
}
