# Todo i app

## App Store-godkjenning

### MÅ FIKSES

- [ ] Fiks live `https://evolix.no/terms`. Siden svarer, men inneholder fortsatt plassholdere for juridisk navn, organisasjonsnummer, postadresse og kontaktadresse. Dette må være ferdig og konsistent med faktisk virksomhet.
- [ ] Verifiser og ferdigstill Apple-revokering i produksjon. `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID` og `APPLE_PRIVATE_KEY` må være satt riktig på serveren, ellers kan kontosletting feile i review.
- [ ] Verifiser at kontosletting fungerer ende til ende i produksjon med ekte Apple-bruker, og at Apple-revokering og sletting av alle brukerdata faktisk fullføres uten manuell inngripen.
- [ ] Sett opp og dobbeltsjekk App Store Connect for abonnement: produkter, priser, varighet, entitlement, current offering, review screenshot og review notes for premiumflyten.
- [ ] Fyll inn App Store Connect metadata ferdig: support URL, privacy URL, terms/EULA, kategori, aldersgrense, appbeskrivelse og privacy nutrition labels som matcher faktisk datainnsamling i appen.
- [ ] Velg iPad-strategi. Enten må appen være klar for iPad med riktige screenshots, eller så må `supportsTablet` slås av før innsending.
- [ ] Gjennomfør en full produksjonstest i TestFlight av hele reviewkritisk flyt: Sign in with Apple, onboarding med 18 årsgrense, abonnementskjøp, restore, premiumopplåsing, kontosletting, supportlenker, privacy og terms.

### BØR FIKSES

- [ ] Legg til rate limiting på auth og relevante API-endepunkter for å redusere misbruk og brute force-risiko.
- [ ] Legg til HSTS, HTTPS redirection og relevante sikkerhetsheadere i backend for bedre produksjonshygiene.
- [ ] Stram inn prod-logging i backend og frontend. Fjern eller reduser logging av authdetaljer, Apple-tokenmetadata, bruker-ID-er og andre unødvendige driftsdata.
- [ ] Rydd opp i gjenværende dev- og mockavhengigheter slik at ingen reviewkritisk flyt er avhengig av Expo Go mock eller utviklingsspesifikk oppførsel.
- [ ] Gå gjennom all synlig UI-tekst og fjern gjenværende encoding- eller språkfeil før screenshots og review.
- [ ] Vurder og håndter npm-sårbarhetene fra `npm audit --omit=dev`, spesielt i Expo- og PostCSS-kjeden, slik at produksjonsrisikoen er kartlagt.
- [ ] Gjør en siste manuell kvalitetssjekk av kamera- og strekkodeflyt, premiumgating, support og feiltilstander for å unngå review-merknader på stabilitet og brukeropplevelse.

## QR scanner

- [ ] Fikse QR scanner for diverse fitnessprodukter som ikke finnes i databasen.

## Session

- [ ] Komprimere session items vertikalt.

## Øvelser

- [ ] Gjøre muskelfilter nyttig, kanskje med hovedmuskel/sekundærmuskel i tillegg.
- [ ] Forbedre UI i øvelse-logg.

## Kalkulering

- [ ] Fikse high-rep 1RM-kalkulering.

## Innstillinger og navigasjon

- [ ] Finne bedre plass til innstillingerknapp.

## Språk

- [ ] Norsk/engelsk: oversette øvelser osv.
