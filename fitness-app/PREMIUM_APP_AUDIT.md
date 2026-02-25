# Premium App Audit (Evolix)

Basert på gjennomgang av frontend (`fitness-app`) og backend (`../backend`).

Ingen kodeendringer i denne gjennomgangen. Dette dokumentet beskriver hva som mangler for å gjøre appen premium, betalingsverdig og produksjonsklar.

## Kort dom

Du har allerede en sterk base:

- trening (økter, programmer, progresjon)
- matlogging
- vektlogging
- Apple-innlogging
- egen backend

Det som holder appen tilbake nå er primært:

- produksjonskvalitet
- pålitelighet
- sikkerhet
- tydelig premium-verdiforslag

## Kritiske funn (må fikses før premium-lansering)

fikset?

1. Sikkerhetsrisiko: secrets/connection string i repo

- `../backend/appsettings.Development.json` inneholder lokal connection string og JWT secret.
- Dette må flyttes til sikre miljøvariabler/secrets manager, og nøkler må roteres.

fikset? 2. `WorkoutController` mangler `[Authorize]`

- Flere treningsendepunkter er ikke tydelig beskyttet på controller-nivå.
- Dette er en kritisk sikkerhets-/tilgangskontrollrisiko.

ai må fikse! 3. Feil auth-claim håndtering gir 500 i stedet for 401/403

- `BaseApiController` kaster generell exception når bruker-claim mangler.
- Dette bør returnere kontrollert auth-feil, ikke intern serverfeil.

4. Debug-detaljer for auth er aktivert

- `RETURN_DEBUG_DETAILS = true` i auth-controller.
- API returnerer interne feildetaljer (`detail`, `inner`) som ikke bør eksponeres i prod.

5. User settings API-kontrakt er ufullstendig

- Frontend forventer `GET /user/me/settings`.
- Backend har `PATCH /user/me/settings`, men ikke GET.
- Frontend skjuler dette med fallback (404/405), så sync virker ufullstendig.

6. Treningsøkt lagres i flere steg (ikke atomisk)

- Klient starter økt -> poster sett -> fullfører økt.
- Hvis noe feiler midtveis kan data bli delvis lagret.
- Dette gir dårlig premium-opplevelse og risiko for datainkonsistens.

7. Manglende brukerfeedback ved feil

- Mange steder logger bare `console.log(...)`.
- Brukeren får ikke tydelig status, retry eller forklaring.

8. API base URL-konfig er inkonsistent

- Appen bruker hardkodet `api/baseUrl.ts`.
- README beskriver env-basert URL.
- Dette skaper dev/prod-forvirring og øker risiko for feilbygg.

9. Recovery-funksjonen kan bli tung/treig

- `useRecoveryMap` kan trigge mange ekstra detaljkall.
- Dette må optimaliseres for skalering og premium-flyt.

10. Historikk-endepunkter mangler paging/filtering

- Mat, vekt og treningshistorikk ser ut til å hente “alt”.
- Dette vil bli tregt når brukere får mye data.

11. Auth/token-arkitektur er inkonsistent

- Noen steder brukes `AuthProvider`.
- Andre steder leses token direkte fra `SecureStore` i API-laget.
- Øker risiko for bugs ved logout/expired token/sync.

12. Query/caching-laget er for tynt

- `QueryClient` har nesten ingen global strategi for retry, staleTime, feil og offline.
- Dette gir svak robusthet i praksis.

13. Mangler tester og CI-kvalitetsgate

- Ingen tydelige tester eller automatiske pipelines.
- Vanskelig å garantere stabilitet over tid.

14. Uferdige brukerflater vises i appen

- Settings har flere placeholders (FAQ, support, om appen).
- Premium-brukere forventer ferdige flows og ekte supportkanaler.

15. Dokumentasjon/README er ikke produksjonsklar

- README er fortsatt template-preget og bør erstattes med prosjektspesifikk dokumentasjon.

## Hva som mangler for premium-følelse (høy verdi)

1. Tillit først (viktigst)

- null datatap
- tydelige feilmeldinger
- stabil innlogging
- rask synkronisering
- god support

2. Sterk onboarding

- mål (vekttap/vedlikehold/økning)
- treningsnivå
- tilgjengelig utstyr
- ukentlig tilgjengelighet
- preferanser/begrensninger

3. “Coach intelligence”

- Appen logger mye, men gir for få konkrete anbefalinger tilbake.

4. Premium-system (bentaling/verdi)

- abonnement/paywall
- gratis prøveperiode
- premium-entitlements
- feature tiering

5. Retensjonssystem

- reminders
- streaks
- ukeoppsummering
- planlagte økter
- “kom tilbake i flyten”-flows

6. Integrasjoner

- Apple Health / HealthKit
- smartvekt
- wearables
- kalender

7. Support og drift

- crash reporting
- analytics/funnel tracking
- feedback pipeline
- monitorering og varsling

8. Data-portabilitet

- eksport/import (CSV/JSON)
- backup / gjenoppretting
- tydelig dataeierskap

9. Outcome-fokus i trening

- progresjonsstyring
- deload
- autoregulering
- skadeforebygging
- adherence-score

10. Mer premium mat-del

- favorittmåltider
- oppskrifter
- lagrede kombinasjoner
- enhetskonvertering
- mikronæringsstoffer
- planlagt kosthold

## Konkrete endringer som burde bygges (teknisk + produkt)

1. Atomisk “save workout session”-endpoint

- Ett backend-endpoint som mottar hele økten og lagrer alt i én transaksjon.

2. Fullt user settings API

- `GET /user/me/settings`
- `PATCH /user/me/settings`
- settings-versjonering og konflikthåndtering

3. Felles API-klient på frontend

- timeout
- standard error parsing
- 401-håndtering
- retry-strategi
- request IDs

4. Observability-stack

- crash reporting (f.eks. Sentry)
- produktanalytics
- backend metrics/logging/alerts

5. Paging og datointervall på historikk

- matlogg
- vektlogg
- completed workouts
- exercise history

6. Offline queue + sync-status

- logg mat/vekt/sett offline
- synk når nett er tilbake
- vis sync-state i UI

7. “Daily Coach” på hjemskjermen

- konkrete anbefalinger basert på recovery, progresjon, mål og treningshistorikk

8. Periodisering/autoregulering

- foreslå belastning, deload eller øvelsesbytter automatisk

9. Dynamiske ernæringsmål

- treningsdag vs hviledag
- målrettet cut/maintain/gain
- vekttrend-basert justering

10. Betalingssystem

- abonnementslogikk
- entitlement checks
- restore purchases
- trial/promo-flow

11. Support-flyt i appen

- FAQ
- kontakt support
- feedback / feature request
- bug-report med appversjon/device info

12. Teststrategi

- unit tests (beregninger)
- API integration tests
- e2e for kritiske flows

## Originale og nyttige premium-funksjoner (sterke differensiatorer)

1. Recovery-to-Plan Autopilot

- Appen foreslår automatisk dagens økt basert på restitusjonskart, historikk og mål.

2. Plateau Detective

- Oppdager stagnasjon og foreslår små endringer med forventet effekt.

3. Nutrition Periodization Engine

- Daglige makrojusteringer basert på treningsdag/hviledag og mål.

4. Missed Workout Recovery

- Re-planlegger uka smart når brukeren hopper over økter.

5. Coach Mode (B2C/B2B)

- Coach kan følge klienter og sende planjusteringer.

6. Readiness Score med forklaring

- Ikke bare score, men hvorfor (volum, siste økt, energi, osv.).

7. Outcome Simulator

- Simulerer sannsynlig utvikling 4–12 uker frem.

8. Smart set-forslag i økt

- Foreslår neste sett (vekt/reps) basert på historikk og mål.

9. Meal-to-Performance innsikt

- Viser hvilke kostholdsmønstre som korrelerer med bedre økter/restitusjon.

10. Consistency Insurance

- “Minimum viable day”-forslag for dårlige dager (kort økt / enkel matplan) for å bevare momentum.

## Hva som allerede er sterkt (behold og forsterk)

1. Reell produktbase (ikke bare UI)

- Du har både frontend og backend med faktisk domenelogikk.

2. Recovery/anatomi-retning er differensierende

- Dette kan bli signaturfunksjonen til Evolix.

3. Egen backend gir kontroll

- Viktig for premium-funksjoner som personalisering, coaching og abonnement.

4. Visuell retning er allerede god

- Appen føles mer gjennomarbeidet enn typiske standard-maler.

## Anbefalt roadmap (pragmatisk rekkefølge)

### Fase 1 (0–2 uker): Sikkerhet og stabilitet

- Fjern secrets fra repo og roter nøkler
- Lås ned auth-debug-responser i prod
- Legg `[Authorize]` på manglende controllere
- Standardiser 401/403/500-feil
- Rydd opp i API base URL-konfig (env-basert)

### Fase 2 (2–4 uker): Dataintegritet og kontrakter

- Implementer `GET /user/me/settings`
- Lag atomisk økt-lagring
- Innfør pagination/filtering
- Lag felles frontend API-klient

### Fase 3 (4–6 uker): Premium UX-kvalitet

- Brukerfeedback for feil/suksess
- Loading/empty/retry states
- Sync-status/offlineindikator
- Fjerne debug-logger i brukerflyt
- Ferdigstille settings/support-flows

### Fase 4 (6–10 uker): Premium grunnmur

- Analytics
- Crash reporting
- Paywall + subscriptions
- Trial-flow
- Feature flags / eksperimentering
- Onboarding

### Fase 5 (10–16 uker): Differensierende funksjoner

- Daily Coach
- Recovery Autopilot
- Plateau Detective
- Nutrition Periodization
- Missed Workout Recovery

### Kontinuerlig

- tester
- CI/CD
- monitorering
- support
- dataeksport
- dokumentasjon

## Hva “100% funksjonell” bør bety i praksis

Ingen app er reelt 100% feilfri. Premium-nivå betyr at appen håndterer feil godt og fortsatt oppleves trygg.

Mål som er mer realistiske og verdifulle:

- høy auth-suksessrate
- null datatap i logging
- høy crash-free rate
- raske API-responser
- tydelig supportkanal
- stabil sync på flere enheter

## Neste steg (anbefalt)

1. Lag en P0/P1/P2-backlog fra dette dokumentet
2. Start med sikkerhet + auth + API-kontrakter
3. Bygg deretter premium-følelse (UX, support, stabilitet)
4. Til slutt differensier med “coach intelligence”
