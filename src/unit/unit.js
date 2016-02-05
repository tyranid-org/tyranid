
import Tyr from '../tyr';

//import _   from 'lodash';


class Unit {

  constructor() {
  }


  static parse(text) {

    let u = Tyr.UnitBase.bySymbol(text);
    if (u) {
      return u;
    }

    u = Tyr.UnitFactor.factor(text);
    if (u) {
      return u;
    }

    throw new Error('Unknown unit type: ' + text);
  }
}

Tyr.Unit = Unit;
export default Unit;
