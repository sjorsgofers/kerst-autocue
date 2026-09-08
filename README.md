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
| Snelheid | Schuifregelaar of de knoppen &minus; en + |
| Tekstgrootte | Schuifregelaar of **A&minus;** / **A+** |
| Handmatig scrollen | Gewoon vegen; het automatisch scrollen pauzeert vanzelf en gaat daarna verder |
| Naar een scene springen | Tandwiel &#9881; &rarr; **Scene** |
| Regelbreedte, leeslijn, thema, spiegelen | Tandwiel &#9881; |
| Naar het begin | Tandwiel &#9881; &rarr; **Naar begin** |

De app onthoudt je instellingen en waar je gebleven was.

Met een bluetooth-toetsenbord: `spatie` start/pauzeert, `pijltje omhoog/omlaag` past de snelheid aan,
`+` en `-` de tekstgrootte, `f` volledig scherm, `m` spiegelen, `Home` terug naar het begin.

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
