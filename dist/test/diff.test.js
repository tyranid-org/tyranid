"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai = require("chai");
const mongodb = require("mongodb");
const tyranid_1 = require("../src/tyranid");
const { ObjectID } = mongodb;
const { expect, } = chai;
function add() {
    describe('diff.js', () => {
        let User;
        before(() => {
            User = tyranid_1.default.byName.user;
        });
        // oidX and oidX_ are equals() but not ===
        const oid1 = new ObjectID('55bb8ecff71d45b995ff8c83'), oid1_ = new ObjectID('55bb8ecff71d45b995ff8c83'), oid2 = new ObjectID('5567f2a8387fa974fc6f3a5a'), oid2_ = new ObjectID('5567f2a8387fa974fc6f3a5a');
        const simpleObjTests = [
            [{ a: 1, b: 2 }, { a: 1 }, { b: 0 }],
            [{ a: 1, b: 2 }, {}, { a: 0, b: 0 }],
            [{ a: 1, b: 2 }, { a: 2 }, { a: [2], b: 0 }],
            [{ a: 1, b: 2 }, { a: 2, b: 2 }, { a: [2] }],
            [{ a: oid1 }, { a: oid1_ }, {}],
            [{ a: oid1 }, { a: oid2 }, { a: [oid2] }]
        ];
        const simpleArrTests = [
            [[], [], {}],
            [[1, 2, 3], [1, 2, 4], { 2: [4] }],
            [[1, 2, 3], [1, 2, 3, 4], { 3: [4] }],
            [[1, 2, 3], [1], { n: 1 }],
            [[1, 2, 3], [], { n: 0 }],
            [[1, 2, 3], [3, 2, 1], { 0: 2, 2: 0 }],
            [[1, 2, 3], [3, 2, 1, 4], { 0: 2, 2: 0, 3: [4] }],
            [[1, 2, 3, 4, 5], [2, 3, 4, 5], { 0: [1, 4], n: 4 }],
            [[2, 3, 4, 5], [1, 2, 3, 4, 5], { 0: [1], 1: [-1, 4] }],
            [[1, 2, 3, 4, 5, 6], [1, 3, 4, 5], { 1: [1, 3], n: 4 }],
            [[1, 2, 3, 4, 5, 6], [2, 3, 5, 6], { 0: [1, 2], 2: [2, 2], n: 4 }]
        ];
        const complexObjTests = [
            [{ a: [1, 2] }, { a: [2, 1] }, { a: [0, { 0: 1, 1: 0 }] }],
            [{ a: [1, 2], b: 3 }, { a: [2, 1] }, { a: [0, { 0: 1, 1: 0 }], b: 0 }],
            [{ a: [1, 2] }, { a: [] }, { a: [0, { n: 0 }] }],
            [{ a: [1, 2] }, { a: [1, 2] }, {}],
            [{ a: { b: 1, c: 1 } }, { a: { a: 1, b: 1 } }, { a: [1, { a: [1], c: 0 }] }],
            [{ a: { b: { c: 1 } } }, { a: { d: { c: 1 } } }, { a: [1, { b: 0, d: [{ c: 1 }] }] }],
            [{ a: { b: { c: 1 } } }, { a: { b: { d: 1 } } }, { a: [1, { b: [1, { c: 0, d: [1] }] }] }]
        ];
        const propsObjTests = [
            [{ a: [1, 2] }, { a: [2, 1] }, {}, {}],
            [{ a: [1, 2] }, { a: [2, 1] }, {}, { c: 1 }],
            [{ a: [1, 2] }, { a: [2, 1] }, { a: [0, { 0: 1, 1: 0 }] }, { a: 1 }],
            [{ a: [1, 2], b: 3 }, { a: [2, 1] }, { a: [0, { 0: 1, 1: 0 }] }, { a: 1 }],
            [{ a: [1, 2], b: 3 }, { a: [2, 1] }, { a: [0, { 0: 1, 1: 0 }], b: 0 }, { a: 1, b: 1 }],
            [{ a: { b: 1, c: 1 } }, { a: { a: 1, b: 1 } }, { a: [1, { a: [1], c: 0 }] }, { a: 1 }],
        ];
        it('should diff simple objects', () => {
            for (const test of simpleObjTests) {
                expect(tyranid_1.default.diff.diffObj(test[0], test[1])).to.be.eql(test[2]);
            }
        });
        it('should diff simple arrays', () => {
            for (const test of simpleArrTests) {
                expect(tyranid_1.default.diff.diffArr(test[0], test[1])).to.be.eql(test[2]);
            }
        });
        it('should diff complex objects', () => {
            for (const test of complexObjTests) {
                //console.log(JSON.stringify(diff.diffObj(test[0], test[1])));
                expect(tyranid_1.default.diff.diffObj(test[0], test[1])).to.be.eql(test[2]);
            }
        });
        it('should diff objects with selected props', () => {
            for (const test of propsObjTests) {
                expect(tyranid_1.default.diff.diffObj(test[0], test[1], test[3])).to.be.eql(test[2]);
            }
        });
        it('should patch simple objects', () => {
            for (const test of simpleObjTests) {
                const po = tyranid_1.default.cloneDeep(test[0]);
                tyranid_1.default.diff.patchObj(po, test[2]);
                expect(po).to.be.eql(test[1]);
            }
        });
        it('should patch simple arrays', () => {
            for (const test of simpleArrTests) {
                const po = tyranid_1.default.cloneDeep(test[0]);
                tyranid_1.default.diff.patchArr(po, test[2]);
                expect(po).to.be.eql(test[1]);
            }
        });
        it('should patch complex objects', () => {
            for (const test of complexObjTests) {
                const po = tyranid_1.default.cloneDeep(test[0]);
                tyranid_1.default.diff.patchObj(po, test[2]);
                expect(po).to.be.eql(test[1]);
            }
        });
        it('should support patching O_TRUNCATE_ARRAY_BY_1 with simple paths', () => {
            const u = new User({ siblings: [{ name: 'Jan' }, { name: 'Frederick' }] });
            tyranid_1.default.diff.patchObj(u, { siblings: 1 });
            expect(u.siblings.length).to.eql(1);
        });
        it('should support patching O_TRUNCATE_ARRAY_BY_1 with composite paths', () => {
            const u = new User({ name: { first: 'Jan', suffices: ['Sr', 'The Awesome'] } });
            tyranid_1.default.diff.patchObj(u, { 'name.suffices': 1 });
            expect(u.name.suffices.length).to.eql(1);
            expect(u.name.suffices[0]).to.eql('Sr');
        });
    });
}
exports.add = add;
//# sourceMappingURL=diff.test.js.map