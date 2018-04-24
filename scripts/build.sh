#!/usr/bin/env bash

run_tsc() {
  local PACKAGE=$1;
  echo "building $PACKAGE..."
  `npm bin`/tsc --pretty -p ./packages/$PACKAGE
}

run_tsc tyranid
run_tsc tyranid-tdgen
run_tsc tyranid-graphql

cd ./packages/tyranid-gracl && npm run build