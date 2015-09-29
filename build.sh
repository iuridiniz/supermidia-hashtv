#!/bin/bash
BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )
cd "${BASEDIR}"
exec rsync -avP ../hashtv/bower_components ../hashtv/js ../hashtv/html ../hashtv/css build/
