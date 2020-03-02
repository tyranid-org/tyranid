#!/usr/bin/env bash

run_tsc() {
  local PACKAGE=$1;
  echo "building $PACKAGE..."
  `npm bin`/tsc --pretty -p ./packages/$PACKAGE
}

run_tsc tyranid
run_tsc tyranid-tdgen
run_tsc tyranid-graphql
run_tsc tyranid-openapi
run_tsc tyranid-sanitize
run_tsc tyreant

#echo "building tyranid-gracl..."
#(cd ./packages/tyranid-gracl && npm run build --silent)

(cd ./packages/tyranid && npm run generate-builtin-typings)

(cd ./packages/tyreant && npm run build-css)
