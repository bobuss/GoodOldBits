#!/bin/sh

ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
DIRECTORY="${ROOT:?}/dist"
BRANCH='test'

PROJECTNAME='GoodOldBits'

if sed --version >/dev/null 2>&1 ; then
  sed -i "s/base: '\/'/base: '${PROJECTNAME}'/g" "${ROOT}/vite.config.js"
else
  gsed -i "s/base: '\/'/base: '\/${PROJECTNAME}\/'/g" "${ROOT}/vite.config.js"
fi

printf "\033[0;32mDeleting old content...\033[0m\n"
rm -rf "${DIRECTORY:?}"

printf "\033[0;32mChecking out %s....\033[0m\n" "${BRANCH}"
git worktree add "${DIRECTORY}" ${BRANCH}

printf "\033[0;Building...\033[0m\n"
npm run build

printf "\033[0;32mDeploying %s branch...\033[0m\n" "${BRANCH}"
cd "${DIRECTORY}" &&
  git add --all &&
  git commit -m "Deploy updates" &&
  git push origin ${BRANCH}

echo -e "\033[0;32mCleaning up...\033[0m\n"
git worktree remove "${DIRECTORY}"
