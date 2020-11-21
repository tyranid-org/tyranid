import { RateLimiter } from 'limiter';
import * as _ from 'lodash';
import { Client } from '@googlemaps/google-maps-services-js';
import { Tyr } from 'tyranid';

const clientKey = Tyr.options.google?.map?.clientId!;
// const clientSecret = Tyr.options.google?.map?.clientSecret;

const client = new Client({});

const limiter = new RateLimiter(5, 'second');

const asyncRemoveTokens = (count: number) => {
  return new Promise((resolve, reject) => {
    limiter.removeTokens(count, (error, remainingRequests) => {
      if (error) return reject(error);
      resolve(remainingRequests);
    });
  });
};

export const geocode = async (address: string, address2?: string) => {
  try {
    await asyncRemoveTokens(1);

    let response = await client.geocode({
      params: {
        address,
        key: clientKey,
      },
    });

    if (response.data.status === 'OK') {
      return response.data.results[0].geometry.location;
    }

    console.log(
      `No lat long in response for address: ${address}`,
      JSON.stringify(response, null, 2)
    );

    if (address2) {
      await asyncRemoveTokens(1);
      response = await client.geocode({
        params: {
          address: address2,
          key: clientKey,
        },
      });

      if (response.data.status === 'OK') {
        return response.data.results[0].geometry.location;
      }
    }

    console.log(
      `No lat long in response for address2: ${address2}`,
      JSON.stringify(response, null, 2)
    );
  } catch (err) {
    console.log(err.message);
    console.log(err.stack);
  }

  return null;
};

(Tyr as any).google = {
  geocode,
};
