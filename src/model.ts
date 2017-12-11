// importing common application errors
import * as commonErrors from './commonErrors';
// for pagination
import * as mongoosePaginate from 'mongoose-paginate';
import { SchemaDefinition, Schema, Types, model, Document, PaginateModel, connect, connection, ModelPopulateOptions } from 'mongoose';
require('mongoose').Promise = global.Promise;

export interface QueryInterface {
  criteria: {
    cid?: number;
    _id?: string;
    [name: string]: any
  };
  options?: {
    select?: any;
    limit?: number;
  };
};


export interface StrictQueryInterface extends QueryInterface {
  options: {
    select: any;
    limit?: number;
  };
};

export interface FindByIDOptions {
  _id: string;
  cid?: number;
}

export interface CrudModelInterface {
  findAll: (query: StrictQueryInterface) => Promise<{
    docs: Document[];
    total: number;
  }>;
  findOne: (query: StrictQueryInterface) => Promise<any>;
  insert: (data: any, creator?: any) => Promise<any>;
  update: (options: FindByIDOptions, data: any) => Promise<void>;
  del: (options: FindByIDOptions) => Promise<void>;
  model: PaginateModel<Document>;
  [name: string]: any
}

export async function init(database: string = "mydb") {
  await connect(`mongodb://mongodb/${database}`, { useMongoClient: true });
  console.log(`DB is now connected to ${database}`);
}

export function createSchema(definition: SchemaDefinition) {
  const schema = new Schema(definition);
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id; delete ret.cid; }
  });
  // transforming mongoose post validation errors to our own
  schema.post('validate', function (error: any, doc: any, next: any) {
    let out: any = {};
    /*
     * the client needs to know which field has what error. the out parameter with be something like this
     * { 'name': 'required' } or { 'name': 'maxlength' }
     * or if it has multiple fields error it wil be something like this 
     * { 'name': 'required', 'password': 'required' }
    */
    for (let key in error.errors) {
      let field = error.errors[key];
      out[key] = field.kind.toLowerCase();
    }
    return next(commonErrors.badRequest("Validation Error", error.message, error.code, out));
  });
  // transforming post save errors ( index duplication ) and other unexpected errors to owr own
  schema.post('save', function (error: any, doc: any, next: any) {
    if (error.name !== 'MongoError') {
      return next();
    }
    console.log(error.message);
    if (error.code == 11000) {
      return next(commonErrors.badRequest("Duplicated", error.message, undefined, { "username": "duplicated" }));
    }
    next(commonErrors.badRequest("Saving Error", error.message, error.code));
  });
  return {
    createIndex: (indexs: any) => { schema.index(indexs, { "unique": true }); },
    addPagination: () => { schema.plugin(mongoosePaginate) },
    schema
  }
};

export async function decorateQuery(q: QueryInterface): Promise<StrictQueryInterface> {
  let query: any = { ...q };
  if (!query.criteria) {
    query.criteria = {};
  }
  if (!query.options) {
    query.options = {};
  }
  if (query.criteria.page) {
    query.options.page = query.criteria.page;
    delete query.criteria.page;
  }
  if (query.options.fields) {
    query.options.select = query.options.fields;
    delete query.options.fields;
  }
  if (!query.options.select) {
    query.options.select = {};
  }
  return query;
}

export function createModel(name: string, schema: Schema): CrudModelInterface {
  const myModel = model(name, schema);
  let findAll = async (query: StrictQueryInterface) => {
    if (!query.options.limit) {
      let out = await myModel.find(query.criteria, query.options.select, query.options);
      return { docs: out, total: out.length };
    }
    let out = await myModel.paginate(query.criteria, query.options);
    return { docs: out.docs, total: out.total };
  };
  let findOne = async (query: StrictQueryInterface, populate?: ModelPopulateOptions) => {
    let result;
    try {
      result = myModel.findOne(query.criteria, query.options.select);
      if (populate) {
        result.populate(populate);
      }
      result = await result;
    }
    catch (e) {
      throw commonErrors.badRequest("Find Error", e.message);
    }
    if (!result) {
      throw commonErrors.notFound("Empty Result");
    }
    return result;
  };
  let insert = async (data: any, creator?: any) => {
    let result: any = new myModel(data);
    result.createdBy = creator;
    await result.save();
    return result;
  };
  let update = async (options: FindByIDOptions, data: any) => {
    let result: any = await findOne(
      {
        criteria: options,
        options: { select: {} }
      });
    result.modifiedAt = Date.now();
    await result.set(data);
    await result.save();
  };
  let del = async (options: FindByIDOptions) => {
    let result = await findOne(
      {
        criteria: options,
        options: { select: {} }
      });
    await result.remove();
  };
  return {
    findAll,
    findOne,
    insert,
    update,
    del,
    model: myModel
  };
}
