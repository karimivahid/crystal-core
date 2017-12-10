import * as Koa from 'koa';
import * as Router from 'koa-router';
import * as http from 'http';
import * as bodyParser from 'koa-bodyparser';

export function createApp(routers: any[], listenPort = 4001) {
  const app = new Koa();
  /*
   * after bodyparser this is the first middlware that is called
   * this is where we handle errors and emit an event to check if the error is produced by
   * our program or it's and unexpected ones
  */
  app.use(bodyParser({
    onerror: function (error, ctx) {
      let err: any = new Error("Bad Request");
      err.status = 400
      err.isOperationalError = true;
      err.originalMessage = error.message;
      ctx.throw(err);
    }
  }));

  app.use(async (ctx, next) => {
    const start = Date.now();
    try {
      await next();
    }
    catch (err) {
      ctx.status = err.status || 500;
      ctx.body = {
        message: err.message,
        code: err.code,
        errors: err.errors
      };
      ctx.app.emit('error', err, ctx);
    }
    const ms = Date.now() - start;
    ctx.set('X-Response-Time', `${ms}ms`);
  });

  app.use(async (ctx: any, next) => {
    // inject cid and uid from header to the body for model to validate
    // these headers are set by SUN Gateway
    ctx.requester = {
      cid: ctx.request.headers["x-cid"],
      uid: ctx.request.headers["x-uid"],
      username: ctx.request.headers["x-username"]
    };
    ctx.request.body.cid = ctx.request.headers["x-cid"];
    if (ctx.request.body.createdBy) {
      delete ctx.request.body.createdBy;
    }
    await next();
  });


  // this is not necessary but we send back the server's responce time to the client
  app.use(async (ctx, next) => {
    const start = Date.now();
    await next();
    const ms = Date.now() - start;
    console.log(`${ctx.method} ${ctx.url} - ${ms}`);
  });


  // is a good practice to kill the process if there is a error that we didn't handled
  app.on('error', (err, ctx: Koa.Context) => {
    if (!err.isOperationalError) {
      server.close(() => process.exit(1));
    }
  });

  // telling koa to add ow users router to the application
  routers.forEach(element => {
    if (!element) {
      return;
    }
    app
      .use(element.routes())
      .use(element.allowedMethods());
    console.log(element.stack.map((i: any) => i.methods + i.path));
  }
  );
  // by default we listen to all interfaces on port 4001 but this should be configurable and dependent of environment 
  const server = http.createServer(app.callback()).listen(listenPort);
  console.log("Server is listening on " + listenPort);
  return app;
}