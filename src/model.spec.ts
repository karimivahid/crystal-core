/// <reference types="mocha" />
import { expect } from 'chai';
import * as mongoose from 'mongoose';

import * as model from "./model";

describe('Crud Model Operations', async () => {
  let newCrudSchema: any;
  let newCrudModel: model.CrudModelInterface;
  before(async function () {
    await model.init("testDatabase");
    newCrudSchema = model.createSchema({
      cid: { type: Number, required: true, index: true },
      name: { type: String, maxlength: 20, required: true },
      createdAt: { type: Date, default: Date.now, required: true },
      createdBy: {
        username: { type: String, minlength: 3, maxlength: 20, required: true },
        uid: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
      },
      modifiedAt: { type: Date, default: Date.now },
    });
  });


  it('should create a test model', () => {
    newCrudSchema.addPagination();
    newCrudModel = model.createModel("__testDoc", newCrudSchema.schema);
    expect(newCrudModel.model).not.be.equals(undefined);
  });

  it('should insert 10 new records', async () => {
    const creator = {
      cid: 1,
      uid: "5a097f89f8652d6143019039",
      username: "farhadi_tester"
    };
    for (let i = 0; i < 10; i++) {
      await newCrudModel.insert({ cid: 1, name: "a" + i }, creator);
    }
  });


  it('should find a record with name and limit option', async () => {
    const query = {
      'criteria': { cid: 1, name: "a1" },
      'options': {
        'select': {},
        'limit': 1
      }
    };
    let result = await newCrudModel.findAll(query);
    expect(result.docs).to.be.an('array').and.not.to.be.empty;
  });

  it('should find a record with id', async () => {
    const query = {
      'criteria': { cid: 1, name: "a1" },
      'options': {
        'select': {},
      }
    };
    let result = await newCrudModel.findOne(query);
    expect(result).to.be.an('object').and.not.to.be.empty;
    let result2 = await newCrudModel.findOne({
      criteria: {
        _id: result.id, cid: 1
      },
      options: {
        select: {}
      }
    });
    expect(result2).not.to.be.empty;
  });

  it('should update a record with id', async () => {
    let q: model.QueryInterface = { 'criteria': { cid: 1, name: "a2" } };
    let query = await model.decorateQuery(q);
    let result = await newCrudModel.findOne(query);
    expect(result).not.to.be.empty;
    const id = result.id;
    await newCrudModel.update({ _id: id, cid: 1 }, { name: "updateName" });
    q = { criteria: { _id: id, cid: 1 } };
    query = await model.decorateQuery(q);
    let result2 = await newCrudModel.findOne(query);
    expect(result2).not.to.be.empty;
  });

  it('should delete a record with id', async () => {
    let q: model.QueryInterface = { 'criteria': { cid: 1, name: "a3" } };
    let query = await model.decorateQuery(q);
    let result = await newCrudModel.findOne(query);
    expect(result).not.to.be.empty;
    const id = result.id;
    await newCrudModel.del({ _id: id, cid: 1 });
    try {
      q = { criteria: { _id: id, cid: 1 } };
      query = await model.decorateQuery(q);
      await newCrudModel.findOne(query);
    }
    catch (e) {
      expect(e.message).to.be.equal('Empty Result');
    }
  });

  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });


});