#!/usr/bin/env bash

test() {
  local PACKAGE=$1;
  echo "running $PACKAGE tests..."
  (cd ./packages/$PACKAGE && npm test)
}

test tyranid
test tyranid-tdgen