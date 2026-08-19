#!/bin/zsh
set -eu
package_dir=${0:A:h}
cd "$package_dir/out"
(sleep 1; open "http://localhost:8080") &
exec python3 -m http.server 8080
