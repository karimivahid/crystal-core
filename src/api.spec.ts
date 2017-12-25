/// <reference types="mocha" />
import { expect } from 'chai';
import * as mongoose from 'mongoose';
import * as model from "./model";
import { createCrudAPI } from "./api";


describe('Crud API Operations', async () => {
  let newCrudSchema: any;
  let newCrudModel: model.CrudModelInterface;
  let api: any;
  before(async function () {
    await model.init("testDatabase");
    newCrudSchema = model.createSchema({
      cid: { type: Number, required: true, index: true },
      name: { type: String, maxlength: 20, required: true }
    });
  });


  it('should create a test model and its CRUD API functions', () => {
    newCrudSchema.addPagination();
    newCrudModel = model.createModel("__testDoc2", newCrudSchema.schema);
    expect(newCrudModel.model).not.be.equals(undefined);
    api = createCrudAPI(newCrudModel);

  });

  it('should insert 10 new __testDoc2', async () => {
    let ctx: any = {
      body: {},
      request: { body: { cid: "5a2297320df810338a1fe954", name: "siamak" } },
      requester: {
        cid: "5a2297320df810338a1fe954",
        uid: "5a2297320df810338a1fe953",
        username: "farhadi"
      }
    };
    for (let i = 0; i < 10; i++) {
      ctx.request.body.name += i;
      await api.insert(ctx, undefined);
    }
  });

  it('should get all elements of __testDoc2', async () => {
    let ctx: any = {
      body: {},
      querystring: "",
      request: { body: { cid: "5a2297320df810338a1fe954" } },
      requester: {
        cid: "5a2297320df810338a1fe954",
        uid: "5a2297320df810338a1fe953",
        username: "farhadi"
      }
    };
    await api.findAll(ctx, undefined);
    expect(ctx.body.result.docs).to.be.an('array').and.not.to.be.empty;
  });




  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });


});