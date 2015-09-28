#!/bin/bash

BASEDIR=$( (cd -P "`dirname "$0"`" && pwd) )

freeport=$(sysctl -b net.ipv4.ip_local_port_range | awk '{print $1}'); 
while (netstat -atn | grep -q :$freeport); do 
    freeport=$(expr $freeport + 1); 
done; 

myip=$(ip route get 8.8.8.8 2>/dev/null| awk 'NR==1 {print $NF}')
url="http://${myip:=127.0.0.1}:$freeport/html"
    
(sleep 2 && xdg-open "$url") &

echo "*************************************************************************"
echo "URL to this app is $url "
echo "*************************************************************************"

exec twistd \
        --pidfile /tmp/twistd-web-$RANDOM.pid \
        --logfile - \
        -n web \
        --port ${freeport} \
        --path "${BASEDIR}"