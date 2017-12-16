import { CrudModelInterface, decorateQuery } from './model';
import AppError from './appError';
const q2m = require('query-to-mongo');

export async function errorHandlerMiddleware(ctx: any, next: any, errorsObject: any) {
  try {
    await next();
  }
  catch (e) {
    if (!e.errors || !e.errors.length) {
      throw (e);
    }

    let message = e.message;
    let status = 500;
    let errors = [];
    for (let i = 0, lng = e.errors.length; i < lng; i++) {
      let index = e.errors[i];
      if (!errorsObject[index]) {
        errors.push({ code: index });
        continue;
      }
      let newError = { ...errorsObject[index] };
      if (i == 0) {
        status = newError.httpCode;
      }
      delete newError.httpCode;
      errors.push(newError);
    }
    throw new AppError(message, status, errors);
  }
}


export function createAppError(code: string, errorsObject: any) {
  console.log(errorsObject[code]);
  if (!errorsObject[code]) {
    return;
  }
  let err = { ...errorsObject[code] };
  delete err.httpCode;
  return new AppError(err.message, errorsObject[code].httpCode, [err]);
}


export function createCrudAPI(crudModel: CrudModelInterface, withCID = true) {
  let findAll;
  let findById;
  let insert;
  let updateById;
  let del;


  if (withCID) {
    findAll = async (ctx: any, next: any) => {
      let q = q2m(ctx.querystring);
      let query = await decorateQuery(q);
      query.criteria.cid = ctx.request.body.cid;
      let result = await crudModel.findAll(query);
      ctx.body = { result: result };
      return;
    };
    findById = async (ctx: any, next: any) => {
      let result = await crudModel.findOne({
        criteria: {
          _id: ctx.request.query.id,
          cid: ctx.request.body.cid
        },
        options: {
          select: {}
        }
      });
      ctx.body = { result: result };
    };
    insert = async (ctx: any, next: any) => {
      delete ctx.request.body.id;
      delete ctx.request.body._id;
      let result = await crudModel.insert(ctx.request.body, ctx.requester);
      ctx.body = {
        result: { "id": result._id }
      };
    };
    updateById = async (ctx: any, next: any) => {
      await crudModel.update({ _id: ctx.request.query.id, cid: ctx.request.body.cid }, ctx.request.body);
      ctx.body = { result: true };
    };
    del = async (ctx: any, next: any) => {
      await crudModel.del({ _id: ctx.request.query.id, cid: ctx.request.body.cid });
      ctx.body = { result: true };
    };
  }
  else {
    findAll = async (ctx: any, next: any) => {
      let q = q2m(ctx.querystring);
      let query = await decorateQuery(q);
      let result = await crudModel.findAll(query);
      ctx.body = { result: result };
      return;
    };
    findById = async (ctx: any, next: any) => {
      let result = await crudModel.findOne({
        criteria: { _id: ctx.request.query.id, },
        options: {
          select: {}
        }
      });
      ctx.body = { result: result };
    };
    insert = async (ctx: any, next: any) => {
      delete ctx.request.body.id;
      delete ctx.request.body._id;
      let result = await crudModel.insert(ctx.request.body, ctx.requester);
      ctx.body = {
        result: { "id": result._id }
      };
    };
    updateById = async (ctx: any, next: any) => {
      await crudModel.update({ _id: ctx.request.query.id }, ctx.request.body);
      ctx.body = { result: true };
    };
    del = async (ctx: any, next: any) => {
      await crudModel.del({ _id: ctx.request.query.id });
      ctx.body = { result: true };
    };
  }
  return {
    findAll,
    findById,
    insert,
    updateById,
    del
  };
}

