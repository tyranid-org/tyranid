export function instrumentServerApi(col) {
  const { def: cdef } = col;
  const { api } = cdef;

  if (api) {
    for (const methodName in api) {
      col[methodName] = function() {
        return col.api[methodName].apply(
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

export function instrumentExpressApi(col, app, auth) {
  const { api } = col.def;

  for (const methodName in api) {
    const method = api[methodName];
    const { params, return: returns } = method;

    app
      .route(`/api/${col.def.name}/${methodName}`)
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

          const result = await col.api[methodName].apply(
            {
              source: 'client',
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

export const apiClientCode = () => `
for (const col of Tyr.collections) {
  const { def: cdef } = col;
  const { api } = cdef;

  if (api) {
    for (const methodName in api) {
      const method = api[methodName];

      col[methodName] = function() {
        return ajax({
          method: 'POST',
          url: '/api/' + col.def.name + '/' + methodName,
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
