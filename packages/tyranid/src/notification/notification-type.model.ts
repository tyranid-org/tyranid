import { Tyr } from 'tyranid';

import 'tyranid/builtin/server';

export const NotificationType = new Tyr.Collection({
  id: '_n1',
  name: 'tyrNotificationType',
  dbNmae: 'tyrNotificationTypes',
  enum: true,
  internal: true,
  fields: {
    _id: { is: 'integer' },
    name: { is: 'string', labelField: true },
  },
  values: [
    ['_id', 'name'],
    [1, 'Info'],
    [2, 'Warning'],
    [3, 'Success'],
    [4, 'Error'],
    [5, 'Invalidate'],
  ],
}) as Tyr.TyrNotificationTypeCollection;
