import * as _ from 'lodash';
import Type from '../core/type';

const MarkupType = new Type({
  name: 'markup',

  typescript: '{ type: Tyr.TyrMarkupTypeId, content: string }'
});

export default MarkupType;
