"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/*
const Location = new Tyr.Interface({
  name: 'location',
  fields: {
    city: { is: 'string' }
  }
});

const AnimalType = new Tyr.Collection({
  id: 'a01',
  name: 'animalType',
  enum: true,
  fields: {
    _id:  { is: 'integer' },
    name: { is: 'string', labelField: true }
  },
  values: [
    [ '_id', 'name'  ],

    [    1,  'Cat'   ],
    [    2,  'Dog'   ],
    [    3,  'Human' ]
  ]
});

const Pet = new Tyr.Interface({
  name: 'pet',
  fields: {
    owner: { link: 'animal', where: { type: 'Human' } }
  }
});

const Animal = new Tyr.Collection({
  id: 'a00',
  name: 'animal',
  types: [
    { is:   'location'                                         },
    { is:   'pet',     if: { type: { $in: [ 'Cat', 'Dog' ] } } },
    { name: 'cat',     if: { type: 'Cat'                     } },
    { name: 'dog',     if: { type: 'Dog'                     } },
    { name: 'human',   if: { type: 'Human'                   } }
  ],
  fields: {
    _id:  { is: 'integer' },
    name: { is: 'string' },
    type: { link: 'animalType' },

    job:  { link: 'job', if: { type: 'Human' } }
  },
});

export default Animal;
*/
//# sourceMappingURL=animal.js.map