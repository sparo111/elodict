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
