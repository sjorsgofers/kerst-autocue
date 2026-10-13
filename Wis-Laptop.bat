@echo off
title Laptop wissen
REM ============================================================
REM  Wis-Laptop.bat  -  wist deze laptop volledig en netjes
REM
REM  GEBRUIK (werkt met alleen Tab en Enter):
REM    1) Selecteer dit bestand en druk op Enter (of dubbelklik).
REM    2) Komt er een beveiligingsvraag "Wilt u toestaan...?"
REM       druk dan gewoon op Enter (JA staat al geselecteerd).
REM    3) Volg daarna de Windows-wizard met Tab en Enter:
REM         - Kies:  Alles verwijderen
REM         - Kies:  Lokaal opnieuw installeren
REM         - Zet "Gegevens opschonen / schijf wissen" op JA
REM         - Kies:  Opnieuw instellen
REM    De laptop doet daarna alles zelf en is daarna leeg.
REM
REM  LET OP: dit is onomkeerbaar. Alle data wordt gewist.
REM ============================================================

REM --- Controleer of we al administrator zijn; zo niet, opnieuw starten als admin ---
net session >nul 2>&1
if %errorlevel% neq 0 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

REM --- Start de ingebouwde Windows-reset (de wizard opent) ---
systemreset.exe -factoryreset
