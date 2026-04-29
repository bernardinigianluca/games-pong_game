# Pong Game - AI Open

Pong moderno con UI sportiva, audio dinamico, servizio selezionabile e adattamento responsive desktop/mobile.

## Scripts

Nel progetto puoi usare:

- npm start: avvia in sviluppo.
- npm run build: crea la build di produzione.
- npm test: avvia i test in watch mode.

## Gameplay

- A inizio match scegli chi serve per primo.
- Premi Inizia Partita per il countdown.
- Durante il servizio Player:
	- Spazio o Invio: servizio normale
	- S: servizio con effetto
	- A: servizio ace

## Responsive Notes

- Il campo scala in base al viewport con soglie desktop/tablet/mobile.
- Topbar e pulsanti cambiano layout a breakpoint intermedi.
- Il contenitore usa safe-area per dispositivi con notch.

## Visual QA Checklist

Test rapido consigliato prima di release.

1. Desktop 1920x1080
- Schermata centrata orizzontalmente.
- Scoreboard leggibile e senza overlap.
- Countdown ben visibile, nessun clipping del campo.

2. Laptop 1366x768
- Header, topbar e campo visibili senza tagli verticali.
- Pulsanti principali tutti cliccabili senza scroll orizzontale.

3. Tablet 820x1180 (portrait)
- Topbar in colonna.
- Campo centrato e proporzionato.
- Modal Settings leggibile e chiudibile facilmente.

4. Mobile 390x844
- Nessun contenuto spinto fuori schermo a destra.
- Pulsanti con area touch adeguata.
- Campo ancora giocabile e centrato.

5. Eventi gioco
- Flash lato punto segnato visibile ma breve.
- Pop del punteggio sul lato corretto.
- Badge servizio con pulse al cambio servizio.

6. Accessibilita e motion
- Focus visibile su bottoni e input.
- Con preferenze reduced motion, animazioni quasi disattivate.

## Build Check

Se npm run build termina con successo, la versione e pronta per deploy statico su qualsiasi hosting.

## Pre-Release in 60 Secondi

Procedura rapida consigliata prima di pubblicare:

1. Dev check veloce
- Avvia: npm start
- Verifica che l'app si apra senza errori bloccanti in console.

2. Build check
- Esegui: npm run build
- Conferma: Compiled successfully.

3. Smoke test (2-3 minuti)
- Avvia un match: scegli il primo server, countdown, servizio.
- Verifica punto AI e punto Player: flash lato corretto + pop punteggio.
- Apri Settings: controlla slider, audio toggle, cambio colori.
- Ridimensiona finestra desktop/mobile: layout centrato, nessun overflow a destra.

4. Go / No-Go
- GO: nessun errore bloccante, gameplay ok, build ok.
- NO-GO: bug di gameplay, layout rotto, build fallita.
