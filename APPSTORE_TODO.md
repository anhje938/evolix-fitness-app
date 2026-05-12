# App Store TODO

## MÅ GJØRES

- [ ] Ferdigstill og redeploy `https://evolix.no/privacy` og `https://evolix.no/terms`. Begge URL-ene svarer 200 nå, men publisert innhold har plassholdere for juridisk navn, organisasjonsnummer, adresse og kontakt, og live HTML viser feilkoding av norske bokstaver. Dette må være ekte, lesbart og konsistent med App Store Connect før innsending.
- [ ] Lag en faktisk supportside for App Store Connect, for eksempel `https://evolix.no/support`. `https://evolix.no` svarer bare `OK`, og Apples Support URL må lede til kontaktinformasjon brukere kan bruke for support, feil, tilbakemeldinger og forespørsler.
- [ ] Fyll ut App Store Connect metadata komplett og korrekt: navn, undertittel, beskrivelse, kategori, aldersgrense, support URL, privacy URL, eventuell EULA/terms, review notes, kontaktinfo, iPhone-screenshots og eventuell iPad-metadata.
- [ ] Fyll ut App Store Privacy Nutrition Labels som matcher faktisk datainnsamling i appen og tredjepartene. Appen behandler minst Apple-bruker-ID, eventuell e-post, treningsdata, matdata, vektdata, mål, anbefalinger, kjøps-/abonnementsstatus, tekniske logger, IP/sesjonsdata, RevenueCat-data og OpenFoodFacts-strekkodeoppslag.
- [ ] Verifiser i opplastet iOS-arkiv at privacy manifests, required reason APIs og tredjeparts-SDK-krav er godkjent av App Store Connect. Dette er spesielt viktig fordi Apple krever manifest/signatur for enkelte SDK-er, og appen bruker React Native/Expo/Hermes og RevenueCat.
- [ ] Sett opp abonnement helt ferdig i App Store Connect og RevenueCat: subscription group, produkter, pris, varighet, availability, entitlement `premium`, current offering, produkt-ID-er, review screenshot og review notes. Første abonnement må sendes sammen med en ny appversjon.
- [ ] Sørg for at produksjonsbygg og produksjonsserver har alle nødvendige secrets og miljøvariabler: `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_PREMIUM_ENTITLEMENT_ID`, `REVENUECAT_SECRET_API_KEY`, `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_SECRET_KEY` og riktige CORS-origins.
- [ ] Test Sign in with Apple, RevenueCat-kjøp, restore, premiumopplåsing og backend premium-verifisering i et fysisk TestFlight-produksjonsbygg. Paywall vil feile hvis RevenueCat-nøkler/offering mangler, og serveren vil avvise premium-API-er hvis `REVENUECAT_SECRET_API_KEY` eller entitlement ikke stemmer.
- [ ] Test kontosletting ende til ende i produksjon med ekte Apple-bruker. Flyten må hente ny Apple authorization code, revokere Apple-token, slette bruker og alle domeneobjekter, rydde lokal sesjon og tåle retry uten manuell inngripen.
- [ ] Legg inn tydelig abonnementvarsel i kontosletting: hvis brukeren har auto-renewable subscription, må slettingen forklare at Apple-fakturering kan fortsette til abonnementet avsluttes, og gi direkte vei til å administrere/avslutte abonnement før eller under sletting.
- [ ] Velg iPad-strategi før innsending. `supportsTablet` er `true`, så appen må testes og screenshots leveres for iPad, eller så må iPad-støtte slås av før App Store-innsending.
- [ ] Lever faktisk Premium-innhold som loves, eller fjern det fra kjøpsløftet. Paywall lover premiumprogrammer, og UI viser Premiumprogrammer/Premiumøkter, men repoet har ingen seedet premiumprogram eller premiumøkt. Apple kan avvise ufullstendige eller misvisende IAP-funksjoner.
- [ ] Kjør en full App Review-generalprøve i TestFlight med backend live: ny installasjon, Apple-innlogging, onboarding, matlogging, strekkodeskanning, vekt, trening, ukesrapport, kjøp, restore, administrer abonnement, supportlenker, privacy/terms og kontosletting. Legg inn review notes med forklaring av premiumflyt og eventuelle sampledata, for eksempel en strekkode som fungerer.

## BURDE GJØRES

- [ ] Håndhev 18-årsgrensen eller juster vilkår/personvern. Onboarding sier at brukeren må være minst 18 år, men brukeren kan avbryte registreringen og fortsatt bruke appen uten alder.
- [ ] Legg inn kort ikke-medisinsk disclaimer i appen der coach/anbefalinger vises, ikke bare i terms/privacy. Appen gir trenings-, kostholds- og vektanbefalinger, så bruker og reviewer bør se at dette ikke er medisinsk rådgivning.
- [ ] Rydd synlig UI-tekst før screenshots og review. Eksempler: `Avbryt registre ring`, `Subscriber-programmer`, blanding av norsk/engelsk, og alle steder hvor æøå eller norsk tekst kan se feil ut.
- [ ] Enten fjern språkvalget `English` inntil appen faktisk er oversatt, eller fullfør en reell språkstrategi. Nå er appen i praksis norsk selv om bruker kan velge engelsk.
- [ ] Reduser produksjonslogging i frontend og backend. Fjern eller gate `console.log` i onboarding, login, QR, mat, trening og settings, og stram inn backend-logger for Apple-tokenmetadata, bruker-ID, IP og user agent.
- [ ] Legg til rate limiting på `auth/apple`, `auth/refresh`, `user/me` deletion, strekkodeoppslag og andre muterende endepunkter for å redusere brute force, misbruk og kostnad.
- [ ] Legg til HSTS, HTTPS redirect og relevante sikkerhetsheadere i backend eller reverse proxy. Appen bruker HTTPS mot `evolix.no`, men repoet viser ikke denne herdingen.
- [ ] Stram inn JWT-konfigurasjonsvalidering i produksjon: krev ikke-tom issuer/audience, lang nok secret, og dokumenter nøkkelrotasjon. Nå valideres bare at `SecretKey` finnes.
- [ ] Vurder kortere eller mer konservativ premium-cache på klienten. `SubscriptionProvider` lar positiv premium-cache leve i 72 timer, mens backend gjør egen sjekk. Det er brukervennlig, men kan gi midlertidig feil UI etter refund/cancel.
- [ ] Sett opp RevenueCat webhooks eller App Store Server Notifications for bedre abonnementsdrift, support og raskere synk av kanselleringer, refusjoner og billing issues.
- [ ] Legg til automatisk CI for `dotnet build`, `npm run lint`, `npx tsc --noEmit`, `npx expo-doctor`, `npm audit --omit=dev` og `dotnet list package --vulnerable --include-transitive`.
- [ ] Legg til målrettede tester for auth, refresh-token-rotasjon, Apple-kontosletting, RevenueCat-gating, brukerdata-sletting, mat/vekt/trening-CRUD og premium-låsing.
- [ ] Håndter `npm audit --omit=dev`-funnene i Expo/PostCSS-kjeden med en Expo-støttet oppgradering. Ikke bruk blindt `npm audit fix --force`, siden audit foreslår en breaking nedgradering.
- [ ] Oppdater backendpakker innenfor trygg .NET 8-linje der det er relevant, spesielt `Microsoft.AspNetCore.Authentication.JwtBearer` fra 8.0.0 og `Microsoft.IdentityModel.Protocols.OpenIdConnect` fra 8.15.0.
- [ ] Legg inn backup-, restore- og migreringsrutine for Postgres før produksjonslansering. Backend kjører migrasjoner ved oppstart, men repoet dokumenterer ikke backup/rollback.
- [ ] Legg inn monitoring og alarmer for API, database, Apple auth-feil, RevenueCat-feil, kontosletting og barcode lookup. Dette er viktig for reviewperioden og de første brukerne.
- [ ] Stram inn validering og størrelsesgrenser på DTO-er og fritekstfelt i backend. EF har noen maksgrenser, men API-laget bør avvise ugyldige eller overdrevne payloads tidligere.
- [ ] Vurder dataeksport eller enklere innsynsflow i appen. Det er ikke en tydelig App Store-blokker, men det passer med personvernrettighetene som beskrives i policyen.
- [ ] Kjør manuell tilgjengelighetssjekk med VoiceOver, Dynamic Type, kontrast, små skjermer og store iPhone-modeller. Mange kontroller har custom styling og bør valideres før screenshots.
- [ ] Hvis iPad-støtte beholdes, gjør en egen iPad-polishrunde for modaler, tabbar, grafer, paywall, QR-kamera og treningsøkt-overlay. Tablet-opplevelsen må ikke bare være en strukket iPhone-layout.
- [ ] Fjern ubrukt `android.permission.RECORD_AUDIO` før en eventuell Android-lansering. Appen bruker kamera for strekkode, men ikke lydopptak.
- [ ] Rydd gamle README/TODO-notater med mojibake. Det påvirker ikke App Store direkte, men det gjør releasearbeidet mer feilutsatt.
