#!/bin/bash

NWJS_64_LINUX_URL="http://dl.nwjs.io/v0.13.0/alpha2/nwjs-v0.13.0-alpha2-linux-x64.tar.gz"
NWJS_32_LINUX_URL="http://dl.nwjs.io/v0.13.0/alpha2/nwjs-v0.13.0-alpha2-linux-ia32.tar.gz"

OS=$(uname -s)
ARCH=$(uname -m)
BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )
NWJSDIR="$BASEDIR/nw"
NWJSBIN="$BASEDIR/nw/nw"

cd "$BASEDIR"

# Download NW correct version
case $OS in
    Linux)
        URL=""
        
        case $ARCH in
            x86_64)
                URL="$NWJS_64_LINUX_URL"
                ;;
            i?86)
                URL="$NWJS_32_LINUX_URL"
                ;;
            *)
                echo "Unsuported ARCH: '$ARCH'" && exit 1   
        esac
        
        if [ -d "$NWJSDIR" ]; then 
            rm -rf "$NWJSDIR" || exit 1
        fi
        mkdir -p "$NWJSDIR" || exit 1
        
        echo "Downloading NW.js from '$URL'..."
        curl --progress-bar "$URL" | tar -xzf - -C "$NWJSDIR" --strip-components=1 || exit 1
        echo "Done"
        ;;
    *)
        echo "Unsuported OS: '$OS'" && exit 1
        ;;
esac

# install bower components
echo "Installing javascript dependecies via bower..."
bower install || exit 1
echo "Done"

echo "In order to run this project with NS.js, do: ${BASEDIR}/run.sh" 
echo "In order to run this project with a browser, do: ${BASEDIR}/serve.sh"