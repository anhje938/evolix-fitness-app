# TODO

## 🔥 Kritiske bugs

-   [ ] **Redigering av økt lagrer som ny økt**
    -   `Rediger økt -> Fullfør` oppretter ny økt i stedet for å
        oppdatere eksisterende.
-   [ ] **Muskelfilter bug**
    -   Må vise begge muskelfilter ved oppretting/redigering av øvelser.
    -   Muskelfilter påvirker heatmap feil.
    -   Recoverymap oppdateres ikke grunnet muskelfilter.
-   [ ] **Keyboard stuck (mobil)**
    -   "Done" fungerer ikke på mobilen til Tysmys (fungerer på min).
-   [ ] **Internal server error etter opprettelse av ny split**
    -   Må undersøkes (backend-feil).
-   [ ] **JWT token expirer etter 1 time**
    -   Implementere refresh token eller øke varighet.
    -   Unngå at bruker må logge inn hele tiden.
-   [ ] **Ved tillegging av øvelser i økt**
    -   Ikke lukk modal/visning etter valg av én øvelse.
    -   Skal kunne velge flere før lukking.

------------------------------------------------------------------------

## 🚀 Viktige forbedringer

-   [ ] Gjøre "Endre måltid"-knapp mer synlig.

-   [ ] Lage retter:

    -   Støtte for flere ingredienser.
    -   Kunne lagre retter.
    -   Favorittmarkering.

-   [ ] For mange klikk i treningsmenyen:

    -   Fjerne eller forenkle "bekreft øvelse".

-   [ ] Recoverymap:

    -   Mer brukervennlig.
    -   Potensiell zoom / større visning.

-   [ ] Innstilling:

    -   Skjule admin-lagte splits, øvelser og økter.

-   [ ] Øktliste:

    -   Ta mindre vertikal plass.
    -   Kunne bestemme rekkefølgen på øvelser.

-   [ ] Øvelser må kunne redigeres.

------------------------------------------------------------------------

## 🧩 Funksjonalitet som bør legges til

-   [ ] Legge til navn i "Hei, {bruker}".

-   [ ] Legge til user-settings valg i registreringen.

-   [ ] Split-kalender integrasjon:

    -   Koble split til logg-kalender.
    -   Split-intervall (x dager mellom økter/split).
    -   Automatisk forskyvning ved hoppede dager.

-   [ ] Valg mellom X og Y øvelse i en økt:

    -   Velges når økten startes.

-   [ ] Toggle for uni- og bilaterale øvelser (venstre/høyre side).

-   [ ] Markere øvelser og økter som aktive/inaktive.

-   [ ] Legge til antall sets og reps per øvelse i økt/split.

    -   Eventuelt linke til split for ulike reps/sets selv med samme
        øvelser.

-   [ ] Hurtigstart-knapper tilgjengelig før scroll.
