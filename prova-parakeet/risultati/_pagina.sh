#!/bin/bash
cd /c/Users/lagga/REPLICA/mia-dictate
U=http://localhost:5240/elodict/prova-parakeet/
R=prova-parakeet/risultati
CH="whisper-base:1:wasm,whisper-base:2:wasm,whisper-base:4:wasm,parakeet-olicorne-w2a8:1:wasm,parakeet-olicorne-w2a8:2:wasm,parakeet-olicorne-w2a8:4:wasm,parakeet-istupakov-int8:1:wasm,parakeet-istupakov-int8:2:wasm,parakeet-istupakov-int8:4:wasm"
node scripts/prova-parakeet-run.mjs --browser chromium --gpu --url $U --configs "$CH" --timeout 900 --out $R/pagina-chromium.json 2>&1 | grep -E ">>|ok|ERRORE|FATALE|salvato"
node scripts/prova-parakeet-run.mjs --browser msedge --gpu --url $U --configs "$CH,whisper-base:1:webgpu,parakeet-olicorne-w2a8:1:webgpu,parakeet-istupakov-int8:1:webgpu" --timeout 900 --out $R/pagina-msedge.json 2>&1 | grep -E ">>|ok|ERRORE|FATALE|salvato"
node scripts/prova-parakeet-run.mjs --browser webkit --url $U --configs "whisper-base:1:wasm,whisper-base:2:wasm,whisper-base:4:wasm,parakeet-olicorne-w2a8:1:wasm,parakeet-olicorne-w2a8:2:wasm,parakeet-olicorne-w2a8:4:wasm,parakeet-istupakov-int8:1:wasm,parakeet-istupakov-int8:4:wasm" --timeout 900 --out $R/pagina-webkit.json 2>&1 | grep -E ">>|ok|ERRORE|FATALE|salvato"
echo FINITO
