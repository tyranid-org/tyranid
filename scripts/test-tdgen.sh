#!/usr/bin/env bash

# pass in second -- because we're nested, so we can pass in --grep
# i.e. npm run test-tdgen -- --grep <pattern of name of test>
(cd ./packages/tyranid-tdgen && npm test --silent -- -- $*)
