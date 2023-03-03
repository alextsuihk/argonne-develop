#!/bin/bash

# git checkout school edition

set -e
echo -n "Checking if there are uncommited changes... "
trap 'echo -e "\033[0;31mCHANGED\033[0m You MUST commit (or stash) before checkout public"' ERR
git diff-index --quiet HEAD --
trap - ERR

echo -e "\033[0;32mUNCHANGED, proceeding ! \033[0m"

if [[ ($1 = "public") ]]
  then
  echo "git checkout public & remove proprietary project folder with project-public"
  git checkout community
  rm -rf ./src/app
  cp -r ./src/app-community ./src/app
  git status
  exit
fi

