# App Store TODO

## BURDE GJØRES

- [ ] Rydd synlig UI-tekst før screenshots og review. Eksempler: `Avbryt registre ring`, `Subscriber-programmer`, blanding av norsk/engelsk, og alle steder hvor æøå eller norsk tekst kan se feil ut.
- [ ] Enten fjern språkvalget `English` inntil appen faktisk er oversatt, eller fullfør en reell språkstrategi. Nå er appen i praksis norsk selv om bruker kan velge engelsk.
- [ ] Legg til rate limiting på `auth/apple`, `auth/refresh`, `user/me` deletion, strekkodeoppslag og andre muterende endepunkter for å redusere brute force, misbruk og kostnad.
- [ ] Legg til HSTS, HTTPS redirect og relevante sikkerhetsheadere i backend eller reverse proxy. Appen bruker HTTPS mot `evolix.no`, men repoet viser ikke denne herdingen.
- [ ] Stram inn JWT-konfigurasjonsvalidering i produksjon: krev ikke-tom issuer/audience, lang nok secret, og dokumenter nøkkelrotasjon. Nå valideres bare at `SecretKey` finnes.
- [ ] Sett opp RevenueCat webhooks eller App Store Server Notifications for bedre abonnementsdrift, support og raskere synk av kanselleringer, refusjoner og billing issues.
- [ ] Legg til automatisk CI for `dotnet build`, `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor`, `npm audit --omit=dev` og `dotnet list package --vulnerable --include-transitive`.
- [ ] Legg til målrettede tester for auth, refresh-token-rotasjon, Apple-kontosletting, RevenueCat-gating, brukerdata-sletting, mat/vekt/trening-CRUD og premium-låsing.
- [ ] Håndter `npm audit --omit=dev`-funnene i Expo/PostCSS-kjeden med en Expo-støttet oppgradering. Ikke bruk blindt `npm audit fix --force`, siden audit foreslår en breaking nedgradering.
- [ ] Oppdater backendpakker innenfor trygg .NET 8-linje der det er relevant, spesielt `Microsoft.AspNetCore.Authentication.JwtBearer` fra 8.0.0 og `Microsoft.IdentityModel.Protocols.OpenIdConnect` fra 8.15.0.
- [ ] Legg inn backup-, restore- og migreringsrutine for Postgres før produksjonslansering. Backend kjører migrasjoner ved oppstart, men repoet dokumenterer ikke backup/rollback.
- [ ] Legg inn monitoring og alarmer for API, database, Apple auth-feil, RevenueCat-feil, kontosletting og barcode lookup. Dette er viktig for reviewperioden og de første brukerne.
- [ ] Vurder dataeksport eller enklere innsynsflow i appen. Det er ikke en tydelig App Store-blokker, men det passer med personvernrettighetene som beskrives i policyen.
- [ ] Kjør manuell tilgjengelighetssjekk med VoiceOver, Dynamic Type, kontrast, små skjermer og store iPhone-modeller. Mange kontroller har custom styling og bør valideres før screenshots.
- [ ] Hvis iPad-støtte beholdes, gjør en egen iPad-polishrunde for modaler, tabbar, grafer, paywall, QR-kamera og treningsøkt-overlay. Tablet-opplevelsen må ikke bare være en strukket iPhone-layout.
- [ ] Fjern ubrukt `android.permission.RECORD_AUDIO` før en eventuell Android-lansering. Appen bruker kamera for strekkode, men ikke lydopptak.
