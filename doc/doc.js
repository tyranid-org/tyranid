
require('es6-promise');

var Tyr            = require('../src/tyranid'),
    pmongo         = require('promised-mongo'),
    _              = require('lodash'),
    fs             = require('fs');


export default function doc() {
  global.ObjectId = pmongo.ObjectId;

  Tyr.config({
    db: pmongo('mongodb://localhost:27017/tyranid_test'),
    validate: true
  });

  let html = '';

  function supify(text) {
    return text ? text.replace(/(-?\d+)/g, text => `<sup>${text}</sup>`) : '';
  }

  function name(prop) {
    return (prop && prop.name) || '';
  }

  function unitSystem() {
    html += '<table>\n';
    html += '<tr><th>Name<th>URL\n'

    for (const row of Tyr.byName.unitSystem.def.values) {
      html += '<tr><td>' + row.name + '<td><a href="' + row.url + '">' + row.url + '</a>\n';
    }

    html += '</table>\n';

    fs.writeFile('doc/unitSystem.html', html, function(err) {
      console.log(err);
    });
  }

  function unitType() {
    html += '<table>\n';
    html += '<tr><th>Abbreviation<th>Name<th>Formula<th>Normal<th>Note\n'

    for (const row of Tyr.byName.unitType.def.values) {
      html += `<tr><td>${row.abbreviation || ''}<td>${row.name}<td>${supify(row.formula)}<td>${row.normal || ''}<td>${row.note || ''}\n`;
    }

    html += '</table>\n';

    fs.writeFile('doc/unitType.html', html, function(err) {
      console.log(err);
    });
  }

  function unitFactor() {
    html += '<table>\n';
    html += '<tr><th>Symbol<th>Prefix<th>Factor\n'

    for (const row of Tyr.byName.unitFactor.def.values) {
      html += `<tr><td>${row.symbol}<td>${row.prefix}<td>${row.factor}\n`;
    }

    html += '</table>\n';

    fs.writeFile('doc/unitFactor.html', html, function(err) {
      console.log(err);
    });
  }

  function unit() {
    html += '<table>\n';
    html += '<tr><th>Name<th>Abbreviation<th>Formula<th>Type<th>System<th>Multiplier<th>Additive\n'

    for (const row of Tyr.byName.unit.def.values) {
      html += `<tr><td>${row.name || ''}<td>${row.abbreviation || ''}<td>${supify(row.formula)}<td>${name(row.type)}<td>${name(row.system)}<td>${row.baseMultiplier || ''}<td>${row.baseAdditive || ''}\n`;
    }

    html += '</table>\n';

    fs.writeFile('doc/unit.html', html, function(err) {
      console.log(err);
    });
  }

  unit();
}
