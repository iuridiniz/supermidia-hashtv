#!/bin/bash

BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )

exec "${BASEDIR}/nw/nw" "${BASEDIR}" $*

