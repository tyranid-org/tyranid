# Tyranid [![npm version](https://badge.fury.io/js/tyranid.svg)](https://badge.fury.io/js/tyranid) [![Build Status](https://travis-ci.org/tyranid-org/tyranid.svg?branch=es6-conversion)](https://travis-ci.org/tyranid-org/tyranid)

## Packages

| Package                                         | Status                                                                                                     | Description                                 |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| [tyranid](http://tyranid.org)                   | [![npm version](https://badge.fury.io/js/tyranid.svg)](https://badge.fury.io/js/tyranid)                   | Tyranid core library                        |
| [tyranid-tdgen](./packages/tyranid-tdgen)       | [![npm version](https://badge.fury.io/js/tyranid-tdgen.svg)](https://badge.fury.io/js/tyranid-tdgen)       | TypeScript definition generator for tyranid |
| [tyranid-graphql](./packages/tyranid-graphql)   | [![npm version](https://badge.fury.io/js/tyranid-graphql.svg)](https://badge.fury.io/js/tyranid-graphql)   | Tyranid GraphQL driver                      |
| [tyranid-gracl](./packages/tyranid-gracl)       | [![npm version](https://badge.fury.io/js/tyranid-gracl.svg)](https://badge.fury.io/js/tyranid-gracl)       | Tyranid Permissions Library                 |
| [tyranid-openapi](./packages/tyranid-openapi)   | [![npm version](https://badge.fury.io/js/tyranid-openapi.svg)](https://badge.fury.io/js/tyranid-openapi)   | OpenAPI Spec Generator for Tyranid          |
| [tyranid-sanitize](./packages/tyranid-sanitize) | [![npm version](https://badge.fury.io/js/tyranid-sanitize.svg)](https://badge.fury.io/js/tyranid-sanitize) | Text sanitization plugin for Tyranid        |
| [tyreant](./packages/tyreant) | [![npm version](https://badge.fury.io/js/tyreant.svg)](https://badge.fury.io/js/tyreant) | Ant driven UI component library for Tyranid        |

## Development

First, install `yarn` and `lerna`:

```shell
npm i -g yarn lerna
```

Next, bootstrap the packages:

```shell
yarn
```

This will install all the dependences for each package in `./packages`, along
with the dev dependencies in the root `./package.json` file. Finally, it
simlinks the built packages to `./node_modules` to allow the packages to reference eachother.

To check that the bootstrap was successfully, run the tests using the linked packages:

```shell
yarn test
```

## Publishing

To ensure that tests are run across all packages before publishing, we use the following npm script to publish

```shell
yarn bump
```

This will internally call `npm test && lerna publish`, and the normal lerna publishing ui
will come up.
