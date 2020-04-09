import * as fetch from 'node-fetch';
import * as moment from 'moment';

import Tyr from '../tyr';
import Collection from '../core/collection';

let rates = {
  USD: {
    EUR: 0.84,
  },
};

const ExchangeRate = new Collection({
  id: '_u5',
  name: 'tyrExchangeRate',
  client: false,
  internal: true,
  fields: {
    _id: { is: 'string' },
    updatedOn: { is: 'datetime' },
    rates: { is: 'object' },
  },
});

async function updateExchangeRates() {
  try {
    let exchangeRates = await ExchangeRate.byId('STANDARD');
    const cutoff = moment().subtract(
      Tyr.options.fixer.every || 8 * 60 * 60 /* default 8 hours */,
      's'
    );

    if (!exchangeRates || cutoff.isAfter(exchangeRates.updatedOn)) {
      const result = await fetch(
        `http://data.fixer.io/api/latest?access_key=${Tyr.options.fixer.accessKey}`
      );

      const json = await result.json();

      // we cache the results from the api in the db so that only one api call needs to be made
      // per tyranid cluster instead of per tyranid instance
      exchangeRates = await ExchangeRate.save({
        _id: 'STANDARD',
        updatedOn: new Date(),
        rates: {
          [json.base]: json.rates,
        },
      });
    }

    rates = exchangeRates.rates;
  } catch (err) {
    console.error('exchange rate error', err);
  }
}

export async function boot() {
  const fixer = Tyr.options.fixer;

  if (fixer) {
    if (!fixer.accessKey) {
      console.error('Fixer configuration provided but no accessKey given');
      return;
    }

    await updateExchangeRates();

    setTimeout(
      () => {
        setInterval(
          updateExchangeRates,
          60 * 60 * 100 // every hour
        );
      },
      // stagger the queries randomly by up to 30s so that different servers don't simultaneously query fixer.io
      Math.floor(Math.random() * 30000)
    );
  }
}

export function getExchangeRate(from, to) {
  const fromRates = rates[from];
  if (fromRates) {
    const rate = fromRates[to];
    if (rate !== undefined) {
      return rate;
    }
  }

  const toRates = rates[to];
  if (toRates) {
    const rate = toRates[from];
    if (rate !== undefined) {
      return 1 / rate;
    }
  }

  //return undefined;
}

export default {
  boot,
  getExchangeRate,
};
