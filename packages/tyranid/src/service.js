export function instrumentServerServices(col) {
  // col.def.service = service metadata
  // col.service = implementation of services
  const { def: cdef } = col;
  const { service } = cdef;

  if (service) {
    for (const methodName in service) {
      const method = service[methodName];

      if (!method.route) {
        method.route = `/api/${col.def.name}/${methodName}`;
      }

      col[methodName] = function() {
        return col.service[methodName].apply(
          {
            source: 'server',
            user: undefined, // TODO:  figure out some way to pass in the user ?
            req: undefined,
            collection: col
          },
          arguments
        );
      };
    }
  }
}

export function instrumentExpressServices(col, app, auth) {
  const { service } = col.def;

  for (const methodName in service) {
    const method = service[methodName];
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
              req: req,
              collection: col
            },
            args
          );

          if (returns) {
            res.json(returns.toClient(result));
          }
        } catch (err) {
          console.error(err);
          res.sendStatus(500);
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
        return ajax({
          method: 'POST',
          url: method.route,
          data: JSON.stringify(arguments),
          contentType: 'application/json'
        }).then(result => {
          // TODO:  iterate through data and wrap results ?
          return result;
        });
      };
    }
  }
}
`;
