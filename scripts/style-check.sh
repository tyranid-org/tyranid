#!/usr/bin/env bash
echo "running prettier..."
OUTPUT=$(npm run prettier)
CHANGED=$(git diff-index --name-only HEAD -- . ':(exclude)packages/tyranid-tdgen/bin/tyranid-tdgen')
if [ -n "$CHANGED" ]; then
  echo "non standard formatting found, please run prettier locally (npm run prettier)..."
  echo "the following files have changed after formatting: "
  echo "$CHANGED"
  exit 1;
else
  echo "formatting correct!"
  exit 0;
fi

echo "running linter..."
npm run lint --silent

