#!/usr/bin/env bash

run_tests_for() {
  local PACKAGE=$1;
  echo "running $PACKAGE tests..."
  (cd ./packages/$PACKAGE && npm test --silent)
}

run_tests_for tyranid
run_tests_for tyranid-tdgen
run_tests_for tyranid-graphql
run_tests_for tyranid-gracl
run_tests_for tyranid-openapi
run_tests_for tyranid-sanitize