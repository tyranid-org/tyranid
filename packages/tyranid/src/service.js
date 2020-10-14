import { handleException } from './express';
import { submitJob } from './job';

export function instrumentServerServices(col) {
  // col.def.service = service metadata
  // col.service = implementation of services
  const { def: cdef } = col;
  const { service } = cdef;

  if (service) {
    for (const methodName in service) {
      const method = service[methodName];

      if (!method.route && method.client !== false) {
        method.route = `/api/${col.def.name}/${methodName}`;
      }

      col[methodName] = method.job
        ? (...args) => {
            submitJob(
              col,
              methodName,
              args,
              undefined // TODO:  user
            );
          }
        : (...args) =>
            col.service[methodName].apply(
              {
                source: 'server',
                user: undefined, // TODO:  figure out some way to pass in the user ?
                req: undefined,
                collection: col,
              },
              args
            );
    }
  }
}

export function instrumentExpressServices(col, app, auth) {
  const { service } = col.def;

  for (const methodName in service) {
    const method = service[methodName];
    if (method.client === false) continue;

    const { params, return: returns, route } = method;

    app
      .route(route)
      .all(auth)
      .post(async (req, res) => {
        try {
          const { body } = req;

          const args = [];

          if (params) {
            let i = 0;
            for (const paramName in params) {
              args.push(params[paramName].fromClient(body[i++]));
            }
          }

          const result = await col.service[methodName].apply(
            {
              source: 'client',
              auth: req.user,
              user: req.user,
              req,
              res,
              collection: col,
            },
            args
          );

          if (returns) {
            res.json(returns.toClient(result));
          } else {
            res.sendStatus(200);
          }
        } catch (err) {
          handleException(res, err);
        }
      });
  }
}

export const serviceClientCode = () => `
for (const col of Tyr.collections) {
  const { def: cdef } = col;
  const { service } = cdef;

  if (service) {
    for (const methodName in service) {
      const method = service[methodName];

      col[methodName] = function() {
        return Tyr.fetch(method.route, {
          method: 'POST',
          body: JSON.stringify(arguments),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(result => {
          // res.json('string') seems to return a {'message':'string'} ???
          if (method.return?.type.name === 'string' && result.message) {
            return result.message;
          }
          // TODO:  iterate through data and wrap results ?
          return result;
        });
      };
    }
  }
}
`;
