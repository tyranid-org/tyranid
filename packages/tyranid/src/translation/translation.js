import Tyr from '../tyr';

import Collection from './collection';

const Translation = new Collection({
  id: '_t4',
  name: 'tyrTranslation',
  client: false,
  internal: true,
  timestamps: true,
  fields: {
    _id: { is: 'string' },
    locale: { is: 'string' },
  },
});

const Term = new Collection({
  id: '_tm',
  name: 'tyrTerm',
  client: false,
  internal: true,
  timestamps: true,
  fields: {
    _id: { is: 'string' },
    locale: { is: 'string' },
    lastAliveOn: { is: 'date' },
  },
});

/*
Get label for question:

Translation code format:

UID_path

Where path is <name>[.<property>]

METADATA

u00_name (implies .label)
u00_name.help

DATA

t00question1_label

STRINGS/TERMS

Labels: ‘Welcome to $$MY_TERM’

tyrTerm {
  _id: ‘string’;
  value: {
    is: ‘string’,
    help: ‘The default English value’
  }
}

{ _id: ‘plan’, value: ‘Plan’ }

tyrTransation {
  Uid: ‘tt0plan’, { ....



translations.findOne({
Uid: Questions.uid,
Code: PROFILE_GENDER_ID,
Locale: ‘en’ 
});

*/

Tyr.Translation = Translation;
Tyr.Translation = Translation;

export default Translation;
