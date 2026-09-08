# Kerstverhaal Autocue

Een autocue (teleprompter) voor het verhaal **"Er was eens de Verdwenen Gouden Kerstster"**.
Gemaakt om schermvullend op een iPad te gebruiken tijdens het inspreken.

## Gebruiken

Open de app in de browser:

**https://sjorsgofers.github.io/kerst-autocue/**

### Schermvullend op de iPad

1. Open de link hierboven in Safari.
2. Tik op het deel-icoon (vierkantje met pijltje) en kies **"Zet op beginscherm"**.
3. Start de app voortaan vanaf het beginscherm: hij opent dan zonder adresbalk, helemaal schermvullend.

Werkt ook offline nadat de pagina een keer is geladen, en de knop met &#9974; zet de app in
volledig scherm binnen de browser zelf.

## Bediening

| Wat | Hoe |
| --- | --- |
| Knoppen tonen of verbergen | Tik ergens op de tekst |
| Automatisch scrollen | Knop **Start / Pauze** |
| Snelheid | Schuifregelaar of de knoppen &minus; en +; het tempo staat in **woorden per minuut**, dus de resttijd klopt ook als je de tekst groter of kleiner maakt |
| Tekstgrootte | Schuifregelaar of **A&minus;** / **A+** |
| Tempo bijsturen tijdens het voorlezen | Veeg omhoog (sneller) of omlaag (langzamer) over de tekst; de tekst zelf verspringt niet, je ziet het nieuwe tempo groot in beeld |
| Handmatig door de tekst scrollen | Zet in het tandwiel &#9881; de knop **Vegen = tempo** uit; dan schuif je met vegen weer door het verhaal en pauzeert het automatisch scrollen zolang je veegt |
| Naar een scene springen | Tandwiel &#9881; &rarr; **Scene** |
| Regelbreedte, leeslijn, spiegelen (voor een teleprompter-spiegel) | Tandwiel &#9881; |
| Wit op zwart of zwart op wit | Tandwiel &#9881; &rarr; **Thema** |
| Naar het begin | Tandwiel &#9881; &rarr; **Naar begin** |

De app onthoudt je instellingen en waar je gebleven was.

Met een bluetooth-toetsenbord: `spatie` start/pauzeert, `pijltje omhoog/omlaag` past de snelheid aan,
`+` en `-` de tekstgrootte, `f` volledig scherm, `m` spiegelen, `Home` terug naar het begin.

De app onthoudt ook waar je gebleven was, dus je kunt hem tussendoor gerust sluiten.

## Tekst aanpassen

De tekst staat in [`script.js`](script.js) als een eenvoudige lijst:

```js
const SCRIPT = [
  { type: "title", text: "Er was eens de Verdwenen Gouden Kerstster" },
  { type: "scene", text: "Scene 1" },
  { type: "p",     text: "Er was eens een meisje genaamd Ellis. ..." },
];
```

* `title` &ndash; de titel
* `scene` &ndash; een scene-kop (verschijnt ook in het sprongmenu)
* `p` &ndash; een gewone alinea
* `verse` &ndash; een gedicht of spreuk (cursief, regelafbrekingen blijven staan)

Pas het bestand aan, sla het op en de app toont de nieuwe tekst.

## Bestanden

* `index.html` &ndash; de pagina
* `styles.css` &ndash; vormgeving
* `app.js` &ndash; scrollen, snelheid, instellingen
* `script.js` &ndash; de tekst van het verhaal
* `manifest.webmanifest`, `icon*.png` &ndash; voor het beginscherm van de iPad
