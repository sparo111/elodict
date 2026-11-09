# Crea le registrazioni di prova per T013b con la voce di sintesi italiana di Windows (Microsoft Elsa):
# 5 frasi da circa 3, 3, 8, 8 e 15 secondi (un file ciascuna) e un file con pause "naturali" dentro la frase.
# I testi giusti sono in frasi.json. Si rigenera con:  powershell -ExecutionPolicy Bypass -File prova-parakeet/make-audio.ps1
Add-Type -AssemblyName System.Speech
$dir = Join-Path $PSScriptRoot "public/audio"
New-Item -ItemType Directory -Force $dir | Out-Null

function Say([string]$file, [string]$ssmlBody) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice("Microsoft Elsa Desktop")
  $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $s.SetOutputToWaveFile((Join-Path $dir $file), $fmt)
  $s.SpeakSsml("<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='it-IT'><break time='300ms'/>$ssmlBody<break time='300ms'/></speak>")
  $s.Dispose()
  Write-Output "creato $file"
}

$frasi = Get-Content (Join-Path $PSScriptRoot "public/frasi.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$i = 1
foreach ($f in $frasi.frasi) { Say ("frase-{0}.wav" -f $i) ([System.Security.SecurityElement]::Escape($f.testo)); $i++ }
# parlato con pause dentro la frase (millisecondi): 350, 450, 500, 600, 650, 800
Say "pause-naturali.wav" ($frasi.pause -join "")
# NB: «frasi-di-fila.wav» (le 5 frasi una dopo l'altra, con 2 secondi di silenzio in mezzo, per provare l'app con il microfono finto)
# si crea con un piccolo programma Python che le accoda; il file è già nel repository.
