"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tyranid_1 = require("../../src/tyranid");
var Book = new tyranid_1.default.Collection({
    id: 'b00',
    name: 'book',
    fields: {
        _id: { is: 'integer' },
        isbn: { is: 'mongoid' },
        serial: { is: 'mongoid' },
        title: { is: 'string' },
        description: { is: 'string' },
        pages: { is: 'integer', async validate() { return this.pages > 5000 && 'Book is too big for the library'; } },
        domain: { is: 'string' }
    },
    primaryKey: { field: 'isbn', defaultMatchIdOnInsert: true },
    fromClient(opts) { this.domain = 'custom'; },
});
exports.default = Book;
//# sourceMappingURL=book.js.map