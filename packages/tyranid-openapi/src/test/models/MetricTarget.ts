import { Tyr } from 'tyranid';

const TargetType = new Tyr.Collection({
  id: 'mtt',
  name: 'metricTargetType',
  enum: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true }
  },
  values: [
    ['_id', 'name'],

    [1, 'Value'],
    [2, 'Metric'],
    [3, 'Value With Spaces']
  ]
});

export default new Tyr.Collection({
  id: 'mtg',
  name: 'metricTarget',
  dbName: 'metricTargets',
  openAPI: {
    parent: 'metric',
    useParentScope: true
  },
  fields: {
    _id: { is: 'mongoid' },
    metricId: { link: 'metric', openAPI: true },
    date: { is: 'date', openAPI: true },
    value: { is: 'double', openAPI: true },
    organizationId: { is: 'mongoid' },
    excludeProperty: { is: 'string' },
    type: {
      link: 'metricTargetType',
      openAPI: true
    }
  }
});
