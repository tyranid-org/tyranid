
import * as _                    from 'lodash';
import * as chai                 from 'chai';
import * as mongodb              from 'mongodb';

import Tyr                       from '../src/tyranid';
import Unit                      from '../src/unit/unit';
import Units                     from '../src/unit/units';
import UnitType                  from '../src/unit/unitType';

const {
  ObjectId
} = mongodb;

const {
  expect,
  assert
} = chai;

function round5(v) {
  return parseFloat(v.toFixed(5));
}

function prec5(v) {
  return parseFloat(v.toPrecision(5));
}

export function add() {
  describe('unit*.js', () => {
    let User;

    before(() => {
      User = Tyr.byName.user;
    });

    describe('unit types', function() {
      it('should parse base and composite unit types', () => {
        expect(UnitType.parse('l'      ).name === 'length'   ).to.be.true;
        expect(UnitType.parse('l^2'    ).name === 'area'     ).to.be.true;
        expect(UnitType.parse('l-2*lum').name === 'luminance').to.be.true;

        expect(() => UnitType.parse('l-2*cure')).to.throw(/"cure"/);
      });

      it('should be shared and unique', () => {
        expect(UnitType.parse('l')           === UnitType.parse('l')           ).to.be.true;
        expect(UnitType.parse('l^2')         === UnitType.parse('l2')          ).to.be.true;
        expect(UnitType.parse('l2m1/s2cur1') === UnitType.parse('cur-1s-2m1l2')).to.be.true;
      });
    });

    describe('units', function() {

      it('should parse unit factors', () => {
        let u = Unit.parse('km');
        expect(u.abbreviation).to.be.eql('km');
        expect(u.factor.symbol).to.be.eql('k');

        u = Unit.parse('cm');
        expect(u.abbreviation).to.be.eql('cm');
        expect(u.factor.symbol).to.be.eql('c');

        u = Unit.parse('kibibyte');
        expect(u.abbreviation).to.be.eql('KiB');
        expect(u.factor.symbol).to.be.eql('Ki');
      });

      it('should parse simple units', () => {
        let u = Units.parse('cm');
        expect(u.cm).to.be.eql(1);

        u = Units.parse('m');
        expect(u.m).to.be.eql(1);

        expect(() => Units.parse('draculas')).to.throw(/"draculas"/);
      });

      it('should parse composite units', () => {
        let u = Units.parse('m/s^2');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        u = Units.parse('m/s2');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        u = Units.parse('N*m');
        expect(u.N).to.be.eql(1);
        expect(u.m).to.be.eql(1);

        u = Units.parse('s-2*m');
        expect(u.m).to.be.eql(1);
        expect(u.s).to.be.eql(-2);

        expect(() => Units.parse('m/foo^2')).to.throw(/"foo"/);
      });

      it('should iterate', () => {
        const expected = { m: 1, s: -2 };
        _.each(Units.parse('m/s^2'), (v, k) => {
          expect(expected[k]).to.be.eql(v);
        });
      });

      it('should be shared and unique', () => {
        expect(Unit.parse('s')     === Unit.parse('s')     ).to.be.true;
        expect(Unit.parse('Mmol')  === Unit.parse('Mmol')  ).to.be.true;
        expect(Unit.parse('km')    === Unit.parse('km')    ).to.be.true;

        expect(Units.parse('m/s2') === Units.parse('s-2*m')).to.be.true;
        expect(Units.parse('N')    === Units.parse('N')    ).to.be.true;
      });

      it('should support "in" on numbers', () => {
        expect(User.paths.age.in.Yr).to.be.eql(1);
      });

      const U = Tyr.U;

      it('should support base units', () => {
        expect(U`m`  .base === U('m')).to.be.true;
        expect(U`m`  .base).to.eql({ m: 1 });
        expect(U`N`  .base).to.eql({ kg: 1, m: 1, s: -2 });
        expect(U`Pa` .base).to.eql({ kg: 1, m: -1, s: -2 });
        expect(U`J`  .base).to.eql({ kg: 1, m: 2, s: -2 });
        expect(U`W`  .base).to.eql({ kg: 1, m: 2, s: -3 });
        expect(U`V`  .base).to.eql({ kg: 1, m: 2, A: -1, s: -3 });
        expect(U`Wb` .base).to.eql({ kg: 1, m: 2, A: -1, s: -2 });
        expect(U`rad`.base).to.eql({});
      });

      it('should have types', () => {
        expect(U('m'    ).type.name).to.eql('length');
        expect(U('m2'   ).type.name).to.eql('area');
        expect(U('m3'   ).type.name).to.eql('volume');
        expect(U('cm*m' ).type.name).to.eql('area');
        expect(U('ft2'  ).type.name).to.eql('area');
        expect(U('N'    ).type.name).to.eql('force');
        expect(U('N/kg' ).type.name).to.eql('acceleration');
        expect(U('N*m'  ).type.name).to.eql('energy');
        expect(U('N*m/s').type.name).to.eql('power');
        expect(U('kC'   ).type.name).to.eql('electricCharge');
      });

      it('should support compatibility checks', () => {
        expect(U`m`.isCompatibleWith(U`ft`)).to.be.true;
        expect(U('cm*m').isCompatibleWith(U('m2'))).to.be.true;
        expect(U('kC').isCompatibleWith(U('kA*us'))).to.be.true;
        expect(U('degC').isCompatibleWith(U('m*s'))).to.be.false;
      });

      it('should support valid conversions', () => {
        const tests = [
          [  1,     'm',       100,    'cm' ],
          [  0,  'degC',        32,  'degF' ],
          [ 80,    'kg', 176.36981,    'lb' ],
          [  5,    'mi',   8.04672,    'km' ],
          [  1,    'ft',        12,    'in' ],
          [  1,    'ft',    0.3048,     'm' ],
          [  1,    'm3',   1000000,   'cm3' ],
          [  1,    'm3',     10000, 'm*cm2' ],
          [  1, 'ft*ms',     0.012,  'in*s' ],
        ];

        for (const test of tests) {
          const fromValue = test[0],
                fromUnits = U(test[1]),
                toValue   = test[2],
                toUnits   = U(test[3]);

          expect(round5(fromUnits.convert(fromValue, toUnits))).to.equal(toValue);
        }
      });

      it('should throw on invalid conversions', () => {
        const tests = [
          [  1,    'm',   'degC' ],
          [  0, 'degC', 'degF*s' ],
          [ 80,   'kg',      'm' ],
          [  5,  'm*s',   'm*s2' ],
          [  1,   'ft',    'in2' ],
        ];

        for (const test of tests) {
          const fromValue = test[0],
                fromUnits = U(test[1]),
                toUnits   = U(test[2]);

          expect(() => fromUnits.convert(fromValue, toUnits)).to.throw(/Cannot convert/);
        }
      });

      it('should support unit arithmetic', () => {
        expect(U('in').add(5, U('ft'), 1)).to.eql(17);

        expect(round5(U('in').subtract(5, U('ft'), 1))).to.eql(-7);

        expect(U('m').multiply(U('s'))).to.eql(U('m*s'));
        expect(U('km').multiply(U('m'))).to.eql(U('km*m'));
        expect(U('m/s').multiply(U('m/s'))).to.eql(U('m2/s2'));

        expect(U('m').divide(U('s'))).to.eql(U('m/s'));
        expect(U('m/s*A').divide(U('s'))).to.eql(U('m/s2*A'));

        expect(U('m').invert()).to.eql(U('m-1'));
        expect(U('m/s*A').invert()).to.eql(U('s*A/m'));
      });

      it('should support planck units', () => {
        const c  = 299792458,
              EP = 1.0,
              mP = EP, // EP == mP
              m  = U`mP`.convert(mP, U`kg`),
              E  = m * c * c;

        expect(prec5(m)).to.eql(2.1765e-8);
        expect(prec5(E)).to.eql(1.9561E9);
      });

      it('should support normals', () => {
        expect(U('m/s'       ).normal()).to.eql({ m: 1, s: -1 });
        expect(U('ft'        ).normal()).to.eql({ m: 1 });
        expect(U('ft/h'      ).normal()).to.eql({ m: 1, s: -1 });
        expect(U('ft*furlong').normal()).to.eql({ m: 2 });
        expect(U('cm*m*ft'   ).normal()).to.eql({ m: 3 });
      });

      it('should support formatting', () => {
        expect(U('m*s-1').toString()).to.eql('m/s');
        expect(U('m*s-2').toString()).to.eql('m/s2');
        expect(U('N2*m*s-1').toString()).to.eql('m1N2/s');
      });
    });
  });
}
