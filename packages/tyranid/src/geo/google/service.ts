import { RateLimiter } from 'limiter';
import * as _ from 'lodash';
import {
  Client,
  LatLngLiteral,
  UnitSystem,
  LatLng,
} from '@googlemaps/google-maps-services-js';
import { Tyr } from 'tyranid';
import { AppError } from '../../core/appError';

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

const ensureApiKey = () => {
  const apiKey = Tyr.options.google?.map?.apiKey!;

  if (!apiKey) {
    throw new AppError(
      'You need to set up your Google Map API key and provide it to Tyranid'
    );
  }

  return apiKey;
};

export const geocode = async (address: string, address2?: string) => {
  const apiKey = ensureApiKey();

  try {
    await asyncRemoveTokens(1);

    let response = await client.geocode({
      params: {
        address,
        key: apiKey,
      },
    });

    if (response.data.status === 'OK') {
      return response.data.results[0].geometry.location;
    }

    console.log(
      `No geocode response for address: ${address}`,
      JSON.stringify(response, null, 2)
    );

    if (address2) {
      await asyncRemoveTokens(1);
      response = await client.geocode({
        params: {
          address: address2,
          key: apiKey,
        },
      });

      if (response.data.status === 'OK') {
        return response.data.results[0].geometry.location;
      }
    }

    console.log(
      `No geocode response for address2: ${address2}`,
      JSON.stringify(response, null, 2)
    );

    return null;
  } catch (err) {
    throw new AppError(err);
  }
};

export const reverseGeocode = async (latitude: number, longitude: number) => {
  const apiKey = ensureApiKey();

  try {
    await asyncRemoveTokens(1);
    const response = await client.reverseGeocode({
      params: {
        latlng: [latitude, longitude],
        key: apiKey,
      },
    });

    if (response.data.status === 'OK') {
      return response.data.results[0].formatted_address;
    }

    console.log(
      `No reverse geocode response for address: [${latitude},${longitude}]`,
      JSON.stringify(response, null, 2)
    );
  } catch (err) {
    throw new AppError(err);
  }

  return null;
};

export const batchGeocode = async (addresses: string[]) => {
  const data: (LatLngLiteral | null | AppError)[] = [];

  await Promise.all(
    addresses.map((address, idx) => {
      return geocode(address)
        .then(latLong => {
          data[idx] = latLong;
        })
        .catch(err => {
          data[idx] = err;
        });
    })
  );

  return data;
};

export const distance = async (
  origin: LatLng,
  destination: LatLng,
  miles?: boolean
) => {
  const apiKey = ensureApiKey();

  try {
    await asyncRemoveTokens(1);
    const response = await client.distancematrix({
      params: {
        origins: [origin],
        destinations: [destination],
        units: miles ? UnitSystem.imperial : UnitSystem.metric,
        key: apiKey,
      },
    });

    if (response.data.status === 'OK') {
      return response.data.rows[0].elements[0].distance.value;
    }

    console.log(
      `No distance for address: [${origin},${destination}]`,
      JSON.stringify(response, null, 2)
    );

    const errMsg = response.data.error_message;

    if (errMsg) {
      console.log(response.data.status + ':' + errMsg);
    } else {
      console.log('Error: no response status!');
    }
  } catch (err) {
    throw new AppError(err);
  }
};

(Tyr as any).google = {
  geocode,
  reverseGeocode,
  batchGeocode,
  distance,
};
