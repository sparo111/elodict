#!/bin/bash
cd /c/Users/lagga/REPLICA/mia-dictate
U=http://localhost:5241/
R=prova-parakeet/risultati
run() { node scripts/prova-app-perf.mjs --url $U "$@" 2>&1 | grep -E "salvato|FATALE"; }
for rep in 1 2; do run --browser chromium --silence 700 --threads 1 --expect 5 --wait 150 --out $R/app-chromium-base-r$rep.json; done
for s in 400 550 700; do run --browser chromium --silence $s --threads 1 --audio prova-parakeet/public/audio/pause-naturali-lunga.wav --expect 99 --wait 43 --out $R/app-chromium-pause-s$s.json; done
for t in 2 4; do run --browser chromium --silence 700 --threads $t --expect 5 --wait 150 --out $R/app-chromium-threads$t.json; done
run --browser msedge --silence 700 --threads 1 --expect 5 --wait 150 --out $R/app-msedge-base.json
run --browser msedge --silence 700 --threads 4 --expect 5 --wait 150 --out $R/app-msedge-threads4.json
run --browser chromium --silence 700 --threads 1 --device webgpu --expect 5 --wait 150 --out $R/app-chromium-webgpu.json
echo FINITO
