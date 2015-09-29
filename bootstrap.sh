#!/bin/bash
BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )

cd "$BASEDIR"

# install bower components
echo "Installing javascript dependecies via bower..."
bower install || exit 1
echo "Done"

# install tsd if available
if which tsd >/dev/null; then
    tsd install
fi

echo "In order to run this project with a browser, do: ${BASEDIR}/serve.sh (need twistd)"
