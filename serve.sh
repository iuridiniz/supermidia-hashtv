#!/bin/bash

BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )

PORT=8082

KERNEL=$(uname -s)

if [ "$KERNEL" = "Darwin" ]; then
    OPEN=$(which open)
elif [ "$KERNEL" = "Linux" ]; then
    OPEN=$(which xdg-open)
fi

export url="http://www.127.0.0.1.xip.io:$PORT/html"
if [ x"$OPEN" != x"" ]; then
    (sleep 2; $OPEN $url)&
fi

echo "*************************************************************************"
echo "URL to this app is $url "
echo "*************************************************************************"

exec twistd \
        --pidfile /tmp/twistd-web-$RANDOM.pid \
        --logfile - \
        -n web \
        --port ${PORT} \
        --path "${BASEDIR}"