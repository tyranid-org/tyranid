#!/usr/bin/env bash

run_tsc() {
  local PACKAGE=$1;
  echo "building $PACKAGE..."
  `npm bin`/tsc --pretty -p ./packages/$PACKAGE
}

run_tsc tyranid
run_tsc tyranid-tdgen

(cd ./packages/tyranid && npm run generate-builtin-typings)
