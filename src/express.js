
import _   from 'lodash';

import { collections } from './common';
import Collection from './classes/Collection';

export default function(app, auth) {


  /*
   *     /api/tyranid
   */

  // TODO:  exposing this as a dynamic API call right now, but this could also be exposed as a
  //        gulp/build task which creates this file at build time.  This would allow this API
  //        call to be eliminated and for the file to be bundled using the client applications
  //        bundling process.  This would also allow splitting up the constant source code into
  //        its own file and also permit using ES6/ES7/etc.
  //
  //        NOTE that if it is exposed as a build task, then dynamic schema metadata will still
  //        need to be handled!

  // WARNING:  embedded javascript must currently be written in ES5, not ES6+
  let file = `
(function() {
  var Tyr = window.Tyr = {
        $all: '$all',
        collections: [],
        collectionsById: {}
      },
      byName = {};

  // TODO:  jQuery 3.0 supports Promises/A+; alternatively eliminate use of jQuery and work with XMLHttpRequest directly
  function ajax(opts) {
    var deferred = $.ajax(opts);

    return new Promise(function(resolve, reject) {
      deferred.then(function(data, textStatus, jqXHR) {
        resolve(data);
      }, function(jqXHR, textStatus, errorThrown) {
        reject(errorThrown);
      });
    });
  }

  function lock(obj) {
    for (var key in obj) {
      Object.defineProperty(obj, key, {
        enumerable:   false,
        writeable:    false,
        configurable: false,
        value:        obj[key]
      });
    }
  }

  Tyr.parseUid = function(uid) {
    const colId = uid.substring(0, 3);

    const col = Tyr.collectionsById[colId];

    if (!col) {
      throw new Error('No collection found for id "' + colId + '"');
    }

    const strId = uid.substring(3);

    const idType = col.def.fields[col.def.primaryKey.field].def.is;

    return {
      collection: col,
      id: idType.fromString(strId)
    };
  }

  const documentPrototype = Tyr.documentPrototype = {
    $save: function() {
      return this.$model.save(this);
    }
  };

  Object.defineProperties(documentPrototype, {
    $label: {
      get: function() {
        return this.$model.labelFor(this);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    },

    $uid: {
      get: function() {
        var model = this.$model;
        return model.idToUid(this[model.def.primaryKey.field]);
      },
      enumerable:   false,
      writeable:    false,
      configurable: false
    }
  });

  lock(documentPrototype);


  function Field(def) {
    this.def = def;
  }
  Tyr.Field = Field;

  Field.prototype.labels = function(text) {

    return ajax({
      url: '/api/' + this.collection.def.name + '/' + this.path + '/label/' + (text || '')
    //}).then(function(docs) {
      //return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };



  function Collection(def) {

    var CollectionInstance = function(data) {
      if (data) {
        _.assign(this, data);
      }
    };
    CollectionInstance.__proto__ = Collection.prototype;
    Object.defineProperty(CollectionInstance, 'name', {
      writeable: false,
      enumerable: false,
      configurable: true,
      value: def.name
    });

    var dp = Object.create(documentPrototype);
    dp.constructor = dp.$model = CollectionInstance;
    CollectionInstance.prototype = dp;

    CollectionInstance.def = def;
    CollectionInstance.id = def.id;

    lock(dp);

    var vals = def.values;

    if (vals) {
      vals = def.values = def.values.map(function(v) {
        return new CollectionInstance(v);
      });

      vals.forEach(function(v) {
        CollectionInstance[_.snakeCase(v.name).toUpperCase()] = v;
      });
    }

    var fbp = CollectionInstance.fields = {};

    function vField(path, field) {
      var def = field.def;
      if (def.is === 'array') {
        vField(path + '._', def.of);
      } else if (def.fields) {
        vFields(path, def.fields);
      }
    }

    function vFields(path, fields) {
      _.each(fields, function(field, name) {
        var p = path ? path + '.' + name : name;
        field.name = name;
        field.path = p;
        field.collection = CollectionInstance;
        fbp[p] = field;
        vField(p, field);
      });
    }

    vFields('', def.fields);

    Tyr.collections.push(CollectionInstance);
    Tyr.collectionsById[CollectionInstance.id] = CollectionInstance;
    byName[def.name] = CollectionInstance;

    return CollectionInstance;
  }

  Collection.prototype.idToUid = function(id) {
    return this.def.id + id;
  };

  Collection.prototype.labelFor = function(doc) {
    return doc[this.def.labelField];
  };

  Collection.prototype.byId = function(id) {
    var col  = this,
        vals = col.def.values;

    if (vals) {
      for (var vi=0; vi<vals.length; vi++) {
        var v = vals[vi];
        if (v._id === id)
          return v;
      }
    } else {

      return ajax({
        url: '/api/' + col.def.name + '/' + id
      }).then(function(doc) {
        return new col(doc);
      }).catch(function(err) {
        console.log(err);
      });
    }
  };

  Collection.prototype.byLabel = function(label) {
    var vals = this.def.values;

    if (vals) {
      for (var vi=0; vi<vals.length; vi++) {
        var v = vals[vi];
        if (v.name === label)
          return v;
      }
    }
  };

  Collection.prototype.find = function(query) {
    var col  = this;

    return ajax({
      url: '/api/' + col.def.name,
      data: query
    }).then(function(docs) {
      return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };

  Collection.prototype.findLabels = function(text) {
    var col  = this;

    return ajax({
      url: '/api/' + col.def.name + '/label/' + text
    //}).then(function(docs) {
      //return docs.map(function(doc) { return new col(doc); });
    }).catch(function(err) {
      console.log(err);
    });
  };

  Collection.prototype.save = function(doc) {

    return ajax({
      url: '/api/' + this.def.name,
      method: 'put',
      data: doc
    })
  };

  // TODO:  support query instead of just an id?
  Collection.prototype.remove = function(id) {
    var col  = this;

    return ajax({
      url: '/api/' + col.def.name + '/' + id,
      method: 'delete'
    }).catch(function(err) {
      console.log(err);
    });
  };

  Tyr.Collection = Collection;
  var def;
`;

  class Serializer {
    constructor(path, depth) {
      this.file = '';
      this.path = path;
      this.depth = depth || 0;
    }

    newline() {
      let depth = this.depth;
      this.file += '\n';
      while (depth--) {
        this.file += '  ';
      }
    }

    field(field) {
      this.file += ': new Field({';
      this.depth++;

      const def = field.def;

      this.newline();
      this.file += 'is: "';
      this.file += def.is.def.name;
      this.file += '",';

      if (def.link) {
        this.newline();
        this.file += 'link: "';
        this.file += def.link.def.name;
        this.file += '",';
      }

      const of = def.of;
      if (of) {
        this.newline();
        this.file += 'of';
        this.field(of);
      }

      if (def.fields) {
        this.fields(def.fields);
      }

      this.depth--;
      this.newline();
      this.file += '}),';
    }

    fields(fields) {
      this.newline();
      this.file += 'fields: {';

      this.depth++;
      _.each(fields, field => {
        if (field.def.client !== false) {
          this.newline();
          this.file += field.name;
          this.field(field);
        }
      });
      this.depth--;
      this.newline();
      this.file += '}';
    }
  }

  collections.forEach(col => {
    const def = col.def;

    if (def.client !== false) {
      const name = def.name;

      file += `
  def = {
    id: ${JSON.stringify(def.id)},
    primaryKey: ${JSON.stringify(def.primaryKey)},
    name: '${name}',`

      const ser = new Serializer('.', 2);
      ser.fields(def.fields);
      file += ser.file;

      file += `
  };`;

      if (def.enum) {
        file += `
  def.values = ${JSON.stringify(def.values.map(v => v.$toClient()))};`;
      }
      if (col.labelField) {
        file += `
  def.labelField = ${JSON.stringify(col.labelField)};`;
      }

      file += `
  new Collection(def);
`;
    }
  });

  file += `
  Tyr.byName = byName;
})();
`;

  app.route('/api/tyranid')
    .all(auth)
    .get(async (req, res) => res.send(file));

  collections.forEach(col => col.express(app, auth));
};

Collection.prototype.express = function(app, auth) {
  const col     = this,
        express = col.def.express;

  if (express) {
    const name = col.def.name;


    if (express.rest || (express.get || express.put)) {

      /*
       *     /api/NAME
       */

      let r = app.route('/api/' + name);
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const query = req.query;

          try {
            const docs = await col.find(query);
            return res.json(col.toClient(docs));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      if (express.rest || express.post) {
        r.post(async function(req, res) {
          try {
            const doc = col.fromClient(req.body);

            if (doc._id) {
              res.status(403).send('Use put for updates');

            } else {
              await doc.$save();

            }

            res.json(col.toClient(doc));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      if (express.rest || express.put) {
        r.put(async function(req, res) {
          try {
            const doc = col.fromClient(req.body);

            if (doc._id) {
              const existingDoc = await col.findOne({ _id: doc._id });
              _.assign(existingDoc, doc);
              await existingDoc.$save();

            } else {
              await doc.$save();

            }

            res.json(col.toClient(doc));
          } catch (err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }


      /*
       *     /api/NAME/:id
       */

      r = app.route('/api/' + name + '/:id');
      r.all(auth);

      if (express.rest || express.get) {
        r.get(async (req, res) => {
          const doc = await col.byId(req.params.id);
          res.json(doc.$toClient());
        });
      }

      if (express.rest || express.delete) {
        r.delete(async (req, res) => {
          try {
            await col.db.remove({ _id : ObjectId(req.params.id) });
            res.sendStatus(200);
          } catch(err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }

      //.put(users.update);


      /*
       *     /api/NAME/label/:search
       */

      if (col.labelField && (express.rest || express.get)) {
        r = app.route('/api/' + name + '/label/:search');
        r.all(auth);
        r.get(async (req, res) => {
          try {
            const query = {
              [col.labelField]: new RegExp(req.params.search, 'i')
            };

            const results = await col.find(query, { [col.labelField]: 1 });
            res.json(results.map(r => r.$toClient()));
          } catch(err) {
            console.log(err.stack);
            res.sendStatus(500);
          }
        });
      }


      /*
       *     /api/NAME/FIELD_PATH/label/:search
       */

      if (express.rest || express.get) {
        _.each(col.fields, field => {
          const to = field.def.link;
          if (to && to.labelField) {
            r = app.route('/api/' + name + '/' + field.path + '/label/:search?');
            r.all(auth);
            r.get(async (req, res) => {
              try {
                const query = {};

                const search = req.params.search;
                if (search) {
                  query[to.labelField] = new RegExp(search, 'i');
                }

                const where = field.def.where;
                if (where) {
                  _.assign(query, where);
                }

                const results = await to.find(query, { [to.labelField]: 1 });
                res.json(results.map(r => r.$toClient()));
              } catch(err) {
                console.log(err.stack);
                res.sendStatus(500);
              }
            });
          }
        });
      }
    }

    if (col.route) {
      col.route(app, auth);
    }
  }
};
