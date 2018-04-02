#!/usr/bin/env bash

run_tests_for() {
  local PACKAGE=$1;
  echo "running $PACKAGE tests..."
  (cd ./packages/$PACKAGE && npm test)
}

run_tests_for tyranid
run_tests_for tyranid-tdgen
run_tests_for tyranid-graphql