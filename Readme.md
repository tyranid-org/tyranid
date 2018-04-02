# Tyranid [![npm version](https://badge.fury.io/js/tyranid.svg)](https://badge.fury.io/js/tyranid) [![Build Status](https://travis-ci.org/tyranid-org/tyranid.svg?branch=es6-conversion)](https://travis-ci.org/tyranid-org/tyranid)

## Packages

| Package                            | Status                                                                               | Description |
|------------------------------------|--------------------------------------------------------------------------------------|-------------|
| [tyranid](https://tyranid.org)     | [![npm version](https://badge.fury.io/js/tyranid.svg)](https://badge.fury.io/js/tyranid)                                                     | Tyranid core library |
| [tyranid-tdgen](https://www.npmjs.com/package/tyranid-tdgen)                      | [![npm version](https://badge.fury.io/js/tyranid-tdgen.svg)](https://badge.fury.io/js/tyranid-tdgen)                                         | TypeScript definition generator for tyranid |
| [tyranid-graphql](https://www.npmjs.com/package/tyranid-graphql)                      | [![npm version](https://badge.fury.io/js/tyranid-graphql.svg)](https://badge.fury.io/js/tyranid-graphql)                                         | Tyranid GraphQL driver |

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

Lerna provides tools for publishing multiple packages. To check which packages
have been changed since the last publish, you can run...

```shell
lerna updated
```

This will output something like the following:

```
lerna info version 2.9.1
lerna info versioning independent
lerna info Checking for updated packages...
lerna info Comparing with v0.4.54.
lerna info Checking for prereleased packages...
lerna info result
- tyranid-graphql
- tyranid-tdgen
- tyranid
```
