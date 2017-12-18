// importing common application errors
import AppError from './appError';
// for pagination
import * as mongoosePaginate from 'mongoose-paginate';
import { SchemaDefinition, Schema, Types, model, Document, PaginateModel, connect, connection, ModelPopulateOptions, ValidationError } from 'mongoose';
require('mongoose').Promise = global.Promise;
const beautifyUnique = require('mongoose-beautiful-unique-validation');


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
  findOne: (query: StrictQueryInterface, populate?: ModelPopulateOptions) => Promise<any>;
  insert: (data: any, creator?: any) => Promise<any>;
  update: (options: FindByIDOptions, data: any) => Promise<void>;
  del: (options: FindByIDOptions) => Promise<void>;
  model: PaginateModel<Document>;
  [name: string]: any
}



/**
 * Takes a database name and tries to connect to mongodb url ( this method should be call once at the start of your program)
 * @async
 * @param   {string} database name of the database
 */
export async function init(database: string = "mydb") {
  try {
    await connect(`mongodb://mongodb/${database}`, { useMongoClient: true });
    console.log(`DB is now connected to ${database}`);
  }
  catch (e) {
    console.log(`Warning: DB can't connect to ${database}, retrying in 10 secconds`);
    setTimeout(init, 10000);
  }
}



/**
 * Acts as a mongoose middleware for creating unified error
 * @param   {any} error Mongoose error
 * @param   {any} doc The document with error
 * @param   {function} next Next middleware
 */
function createValidationError(error: any, doc: any, next: any) {
  if (!error || !error.errors) {
    return next();
  }
  let out: any[] = [];
  for (let key in error.errors) {
    let field = error.errors[key];
    if (field.path === "cid") {
      continue;
    }
    out.push(field.message);
  }
  error.message = "Validation Error";
  error.errors = out;
  next();
}


/**
 * Takes a mongoose schema definition object and creates a schema object
 * It also can add optional tracker parameters
 * @param   {any} definition Mongoose definition object
 * @param   {boolean} addTracker to add tracker parameteres to schema or not
 * @returns {} Sum of a and b or an array that contains a, b and the sum of a and b.
 */
export function createSchema(definition: SchemaDefinition, addTracker = true, tenancy = true) {
  if (addTracker) {
    definition['createdAt'] = { type: Date, default: Date.now, required: true };
    definition['createdBy'] = {
      username: { type: String, required: true },
      uid: { type: "ObjectId", ref: 'User', required: true }
    };
    definition['modifiedAt'] = { type: Date, default: Date.now };
  }
  if (tenancy) {
    definition['cid'] = { type: Number, required: true, index: true }
  }
  const schema = new Schema(definition);
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: function (doc: any, ret: any) { delete ret._id; delete ret.cid; }
  });
  return {
    createIndex: (indexs: any, message: string) => { schema.index(indexs, { "unique": message }); },
    addPagination: () => {
      schema.plugin(mongoosePaginate);
      schema.plugin(beautifyUnique);
      schema.post('validation', createValidationError);
      schema.post('save', createValidationError);
      schema.post('update', createValidationError);
      schema.post('findOneAndUpdate', createValidationError);
    },
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
    result = myModel.findOne(query.criteria, query.options.select);
    if (populate) {
      result.populate(populate);
    }
    result = await result;
    if (!result) {
      throw new AppError("Empty Result", 400, [{
        code: "10",
        message: "Nothing found with these criteria"
      }
      ]);
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
