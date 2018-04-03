#!/usr/bin/env bash

run_tests_for() {
  local PACKAGE=$1;
  echo "building $PACKAGE..."
  `npm bin`/tsc -p ./packages/$PACKAGE
}

run_tests_for tyranid
run_tests_for tyranid-tdgen
run_tests_for tyranid-graphql