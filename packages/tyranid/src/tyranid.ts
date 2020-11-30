import Tyr from './root';

import './job';

import './sanitize';

import './geo/continent.model';
import './geo/country.model';
import './geo/province.model';
import './geo/county.model';

import './geo/google/service';

import './notification/notification-type.model';
import './notification/notification.model';

const generated = true;
const labelField = true;
const labelImageField = true;
const orderField = true;
const readonly = true;
const required = true;
const unique = true;

export {
  Tyr,
  generated,
  labelField,
  labelImageField,
  orderField,
  readonly,
  required,
  unique,
};

export default Tyr;
