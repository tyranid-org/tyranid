# Tyranid Monorepo

This repository contains all tyranid packages, individually located in [`./packages`](./packages):

- [`tyranid`](./packages/tyranid) [![npm version](https://badge.fury.io/js/tyranid.svg)](https://badge.fury.io/js/tyranid)
- [`tyranid-tdgen`](./packages/tyranid-tdgen) [![npm version](https://badge.fury.io/js/tyranid-tdgen.svg)](https://badge.fury.io/js/tyranid-tdgen)
- [`tyranid-graphql`](./packages/tyranid-graphql) [![npm version](https://badge.fury.io/js/tyranid-graphql.svg)](https://badge.fury.io/js/tyranid-graphql)

## Development

First, install `yarn` and `lerna`:

```shell
npm i -g yarn lerna
```

Next, bootstrap the packages:

```shell
lerna bootstrap
```

This will install all the dependences for each package in `./packages`, along
with the dev dependencies in the root `./package.json` file. Finally, it
simlinks the built packages to `./node_modules` to allow the packages to reference eachother.

To check that the bootstrap was successfully, run the tests using the linked packages:

```shell
yarn test
```