
var _ = require( 'lodash' );

/*
   /. server inherits client objects

   /. validation (server vs. client)

   /. authorized methods + filtering attributes to the client

   /. offline support

   /. store cache on client

   /. tids ?
   
      f23<mongo id (24 chars) >

      <letter + 2 alphanum><mongo id>


   ?. how do we share code between server and client from the same source .js file ?


  var String = {
  }

  var Date = {
  }



  representations:

  (a)

  {
    name: 'Event',
    fields: {
      name: { type: String },
      desc: { type: String },
      when: { type: Date   }
    }
  }

  (b)

  function Event({
    ...
  });

*/

function classify( proto, staticMethods ) {
  var constructor = proto.constructor ? proto.constructor : function() {};
  constructor.prototype = proto;
  return _.extend( constructor, staticMethods );
}

var Collection = classify({
  constructor: function( def ) {
    this.def = def;
  }
}, {
});

module.exports = {

  Collection: Collection

};

