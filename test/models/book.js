var tyr = require('../../src/tyranid');

var Book = new tyr.Collection({
  id: 'b00',
  name: 'book',
  fields: {
    _id: { is: 'integer' },
    isbn: { is: 'mongoid' }, // Pretend ISBNs are ObjectIds
    title: { is: 'string' }
  },
  primaryKey: { field: 'isbn', defaultMatchIdOnInsert: true }
});

module.exports = Book;
