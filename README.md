# Todo i app

## App Store-godkjenning

### Blokkerende

- [ ] Gjør kontosletting komplett for alle brukerdata, inkludert adaptive data, coach settings, exercise targets, nutrition history, weekly reports og recommendations.
- [ ] Lag fungerende offentlige lenker for vilkår og personvern. `https://evolix.no/terms` og `https://evolix.no/privacy` må ikke gi 404.
- [ ] Oppdater personvernerklæringen med kontaktinfo, tredjepartsbehandling, RevenueCat, OpenFoodFacts, logging, lagringstid og sletting.
- [ ] Utvid paywall med tydelig tekst om automatisk fornyelse, prisperiode, kansellering og lenker til vilkår/personvern.

### Må fikses før innsending

- [ ] Sett opp RevenueCat og App Store Connect-produkter: månedlig/årlig abonnement, entitlement, current offering, review screenshot og review notes.
- [ ] Bruk Apples systemknapp eller en HIG-kompatibel Sign in with Apple-knapp.
- [ ] Gjør support faktisk tilgjengelig. FAQ og Kontakt support må åpne en fungerende side, e-post eller skjema.
- [ ] Sørg for at `terms`, `privacy`, App Store Connect, paywall og appen peker til samme fungerende URL-er.
- [ ] Legg inn review notes som forklarer Apple-innlogging, premium/paywall, strekkodeskanning og testflyt.

### Sikkerhet og kvalitet

- [ ] Legg til rate limiting på auth og relevante API-endepunkter.
- [ ] Legg til HSTS, HTTPS-redirection og relevante sikkerhetsheadere i backend.
- [ ] Fjern unødvendig prod-logging av auth/debugtilstand og bruker-ID-er.
- [ ] Fiks premium-cache slik at premiumstatus ikke kan gjenbrukes mellom ulike kontoer på samme enhet.
- [ ] Fjern synlige UI-tekster uten norske bokstaver, for eksempel `pa`, `prov`, `maltid` og `ernaring`.
- [ ] Vurder npm-sårbarhetene fra `npm audit --omit=dev`, særlig Expo/PostCSS-kjeden.

### App Store Connect

- [ ] Opprett/ferdigstill app record for bundle ID `no.evolix.app`.
- [ ] Fyll inn kategori, aldersgrense, support URL, privacy URL, terms/EULA og appbeskrivelse.
- [ ] Fyll inn privacy nutrition labels basert på faktisk datainnsamling.
- [ ] Legg inn iPhone-screenshots.
- [ ] Legg inn iPad-screenshots, eller slå av tablet-støtte hvis appen ikke skal vurderes som iPad-app.
- [ ] Sett riktig eksport-/krypteringserklæring i App Store Connect i tråd med `ITSAppUsesNonExemptEncryption`.

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
