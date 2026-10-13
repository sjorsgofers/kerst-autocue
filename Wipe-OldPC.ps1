<#
.SYNOPSIS
    Wist de persoonlijke data van een oude Windows-pc voordat je hem wegdoet,
    verkoopt of weggeeft, en overschrijft de vrije ruimte zodat verwijderde
    bestanden niet meer terug te halen zijn.

.BESCHRIJVING (NL)
    Dit script is bedoeld voor JE EIGEN pc die je wilt opschonen. Het werkt in
    drie stappen:

      1. Verwijdert je persoonlijke mappen (Bureaublad, Documenten, Downloads,
         Afbeeldingen, Video's, Muziek) en de prullenbak.
      2. Overschrijft de VRIJE ruimte op elke vaste schijf met het ingebouwde
         Windows-commando `cipher /w`. Daardoor zijn eerder verwijderde
         bestanden niet meer te herstellen met recovery-tools.
      3. (Optioneel, met -FactoryReset) start Windows' eigen "Deze pc opnieuw
         instellen" waarbij de schijf wordt schoongemaakt en Windows opnieuw
         wordt geinstalleerd — de nette manier om een pc "als nieuw" weg te geven.

    Omdat je toetsenbord/muis het niet meer goed doen, kun je het script met
    parameters draaien (bijv. -Force -FactoryReset), zodat het vanzelf doorloopt
    zonder dat je op vragen hoeft te antwoorden.

.LET OP — DIT IS ONOMKEERBAAR
    Alles wat dit script wist is daarna definitief weg. Zet eerst een back-up van
    wat je wilt bewaren op een externe schijf of in de cloud. Draai dit NIET op
    een pc waarvan je de data nog nodig hebt.

.PARAMETER Force
    Sla alle ja/nee-vragen over en voer meteen uit. Handig als je toetsenbord
    hapert. Zonder deze schakelaar vraagt het script eerst om bevestiging.

.PARAMETER SkipFreeSpace
    Sla het overschrijven van de vrije ruimte over (stap 2). Gaat sneller, maar
    eerder verwijderde bestanden blijven dan technisch herstelbaar.

.PARAMETER FactoryReset
    Start na het wissen Windows' "Deze pc opnieuw instellen" met de optie om de
    schijf volledig schoon te maken. De pc herstart en installeert Windows
    opnieuw. Dit is de grondigste, meest nette manier.

.PARAMETER Drives
    Welke schijfletters je vrije ruimte wilt overschrijven. Standaard alle vaste
    schijven. Bijvoorbeeld: -Drives C,D

.VOORBEELDEN
    # Veilige modus: vraagt eerst bevestiging
    .\Wipe-OldPC.ps1

    # Alles automatisch, inclusief fabrieksreset (geen vragen)
    .\Wipe-OldPC.ps1 -Force -FactoryReset

    # Alleen vrije ruimte op C: overschrijven
    .\Wipe-OldPC.ps1 -Drives C

.GEBRUIK
    1. Sla dit bestand op de oude pc op, bijvoorbeeld als C:\Wipe-OldPC.ps1
    2. Open PowerShell ALS ADMINISTRATOR (rechtermuisklik > Als administrator).
    3. Draai eenmalig:  Set-ExecutionPolicy -Scope Process Bypass -Force
    4. Draai:           .\Wipe-OldPC.ps1 -Force -FactoryReset
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$SkipFreeSpace,
    [switch]$FactoryReset,
    [string[]]$Drives
)

$ErrorActionPreference = 'Continue'

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# --- 0. Controles vooraf ----------------------------------------------------

Write-Host "=========================================================" -ForegroundColor Yellow
Write-Host "   OUDE-PC WISSEN  —  dit verwijdert je data definitief"   -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Yellow

if (-not (Test-Admin)) {
    Write-Host ""
    Write-Host "Dit script moet als ADMINISTRATOR draaien." -ForegroundColor Red
    Write-Host "Sluit dit venster, klik met rechts op PowerShell en kies" -ForegroundColor Red
    Write-Host "'Als administrator uitvoeren', en start het script opnieuw." -ForegroundColor Red
    exit 1
}

# Bevestiging, tenzij -Force
if (-not $Force) {
    Write-Host ""
    Write-Host "Je staat op het punt om ONHERSTELBAAR data te wissen van deze pc." -ForegroundColor Yellow
    Write-Host "Zorg dat je een back-up hebt van alles wat je wilt bewaren." -ForegroundColor Yellow
    Write-Host ""
    $answer = Read-Host "Typ exact WISSEN om door te gaan"
    if ($answer -ne 'WISSEN') {
        Write-Host "Afgebroken. Er is niets gewijzigd." -ForegroundColor Green
        exit 0
    }
}

# --- 1. Persoonlijke mappen en prullenbak legen -----------------------------

Write-Step "Stap 1/3 — Persoonlijke mappen en prullenbak verwijderen"

$userFolders = @(
    [Environment]::GetFolderPath('Desktop'),
    [Environment]::GetFolderPath('MyDocuments'),
    [Environment]::GetFolderPath('MyPictures'),
    [Environment]::GetFolderPath('MyVideos'),
    [Environment]::GetFolderPath('MyMusic'),
    (Join-Path $env:USERPROFILE 'Downloads')
)

foreach ($folder in ($userFolders | Select-Object -Unique)) {
    if ([string]::IsNullOrWhiteSpace($folder)) { continue }
    if (Test-Path $folder) {
        Write-Host "   Legen: $folder"
        Get-ChildItem -LiteralPath $folder -Force -ErrorAction SilentlyContinue |
            ForEach-Object {
                Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
    }
}

Write-Host "   Prullenbak legen..."
try {
    Clear-RecycleBin -Force -ErrorAction Stop
} catch {
    # Clear-RecycleBin bestaat niet op oudere PowerShell-versies; negeer stil.
    Write-Host "   (Prullenbak kon niet automatisch worden geleegd — niet erg.)" -ForegroundColor DarkGray
}

# --- 2. Vrije ruimte overschrijven ------------------------------------------

if ($SkipFreeSpace) {
    Write-Step "Stap 2/3 — Vrije ruimte overschrijven OVERGESLAGEN (-SkipFreeSpace)"
} else {
    Write-Step "Stap 2/3 — Vrije ruimte overschrijven (kan lang duren)"

    if ($Drives) {
        $targetLetters = $Drives | ForEach-Object { $_.TrimEnd(':').ToUpper() }
    } else {
        # Alle vaste (interne) schijven; DriveType 3 = lokale vaste schijf.
        $targetLetters = Get-CimInstance Win32_LogicalDisk -Filter "DriveType = 3" |
            Select-Object -ExpandProperty DeviceID |
            ForEach-Object { $_.TrimEnd(':') }
    }

    foreach ($letter in $targetLetters) {
        $root = "$letter`:\"
        if (-not (Test-Path $root)) {
            Write-Host "   Overslaan $root (niet gevonden)" -ForegroundColor DarkGray
            continue
        }
        Write-Host "   Overschrijven vrije ruimte op $root ..." -ForegroundColor White
        Write-Host "   (cipher schrijft de hele vrije ruimte vol — dit duurt bij" -ForegroundColor DarkGray
        Write-Host "    een grote schijf makkelijk een uur of meer, dat is normaal.)" -ForegroundColor DarkGray
        # cipher /w gebruikt de map alleen om de juiste schijf te kiezen.
        & cipher.exe /w:$root
    }
}

# --- 3. Optioneel: fabrieksreset met schijf schoonmaken ---------------------

if ($FactoryReset) {
    Write-Step "Stap 3/3 — Windows opnieuw instellen en schijf schoonmaken"
    Write-Host "   De pc herstart nu en begint met een volledige reset." -ForegroundColor Yellow
    Write-Host "   Windows overschrijft hierbij de schijf en installeert zichzelf" -ForegroundColor Yellow
    Write-Host "   opnieuw. Laat de pc aan de stroom en wacht tot hij klaar is." -ForegroundColor Yellow

    if (-not $Force) {
        $go = Read-Host "Typ RESET om de fabrieksreset nu te starten (of Enter om te stoppen)"
        if ($go -ne 'RESET') {
            Write-Host "   Fabrieksreset niet gestart. Stappen 1 en 2 zijn wel uitgevoerd." -ForegroundColor Green
            exit 0
        }
    }

    # Ingebouwde Windows-reset. De interactieve wizard laat je "Alles
    # verwijderen" + "De schijf volledig opschonen" kiezen.
    Start-Process -FilePath "$env:SystemRoot\System32\systemreset.exe" -ArgumentList "-factoryreset"
} else {
    Write-Step "Klaar"
    Write-Host "   Je persoonlijke mappen zijn gewist en (indien niet overgeslagen)" -ForegroundColor Green
    Write-Host "   de vrije ruimte is overschreven." -ForegroundColor Green
    Write-Host ""
    Write-Host "   Wil je de pc helemaal als nieuw achterlaten, draai dan nog een keer" -ForegroundColor Green
    Write-Host "   met:  .\Wipe-OldPC.ps1 -FactoryReset" -ForegroundColor Green
}
