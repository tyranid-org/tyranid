#!/usr/bin/env bash

run_tsc() {
  local PACKAGE=$1;
  echo "building $PACKAGE..."
  `npm bin`/tsc --pretty -p ./packages/$PACKAGE
}

run_tsc tyreant
