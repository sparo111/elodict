# Crea le registrazioni di prova per i test del riconoscimento offline, con le voci di sintesi di Windows.
# I file NON si salvano in git (sono nella cartella e2e/fixtures, ignorata): si rigenerano con questo script.
#   powershell -ExecutionPolicy Bypass -File e2e/make-fixtures.ps1
Add-Type -AssemblyName System.Speech

$dir = Join-Path $PSScriptRoot "fixtures"
New-Item -ItemType Directory -Force $dir | Out-Null

function Make-Wav([string]$voiceName, [string]$lang, [string]$text, [string]$file) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice($voiceName)
  $fmt = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
  $s.SetOutputToWaveFile((Join-Path $dir $file), $fmt)
  $ssml = "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='$lang'><break time='2000ms'/>$text<break time='3000ms'/></speak>"
  $s.SpeakSsml($ssml)
  $s.Dispose()
  Write-Output ("creato {0}" -f $file)
}

Make-Wav "Microsoft Zira Desktop" "en-US" "Hello world. This is a test of the offline dictation." "speech-en.wav"
Make-Wav "Microsoft Elsa Desktop"  "it-IT" "Ciao a tutti. Questa &#232; una prova della dettatura." "speech-it.wav"

# T013d: altre registrazioni per provare la lingua di Parakeet (si riconosce da sola).
# Voce italiana (Elsa) e inglese (Zira) sono vere per quelle lingue. Per francese e spagnolo Windows qui NON ha voci: le due frasi
# sono lette da una voce italiana, quindi sono una prova di stress (accento italiano), NON una prova di lingua madre.
Make-Wav "Microsoft Elsa Desktop" "it-IT" "Domani mattina devo portare la macchina dal meccanico, poi andiamo a mangiare una pizza." "speech-it2.wav"
Make-Wav "Microsoft Zira Desktop" "en-US" "Tomorrow morning I have to take the car to the mechanic, then we are going out for lunch." "speech-en2.wav"
Make-Wav "Microsoft Elsa Desktop" "it-IT" "Buenos d&#237;as, quisiera reservar una mesa para dos personas, ma&#241;ana por la tarde." "speech-es-da-it.wav"
Make-Wav "Microsoft Elsa Desktop" "it-IT" "Bonjour, je voudrais r&#233;server une table pour deux personnes, demain apr&#232;s-midi." "speech-fr-da-it.wav"

# T013d: comandi vocali dettati («virgola», «punto», «a capo») per provare che Parakeet li passa agli stessi comandi dell'app.
Make-Wav "Microsoft Elsa Desktop" "it-IT" "Buongiorno virgola vorrei un caff&#232; punto a capo grazie mille punto" "speech-comandi-it.wav"
