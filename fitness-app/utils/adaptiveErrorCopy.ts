import { isAdaptiveApiError } from "@/api/adaptive";

type AdaptiveSurface = "plan" | "report";

type AdaptiveErrorCopy = {
  title: string;
  message: string;
};

function resourceLabel(surface: AdaptiveSurface) {
  return surface === "report" ? "Rapporten" : "Planen";
}

export function getAdaptiveErrorCopy(
  error: unknown,
  surface: AdaptiveSurface
): AdaptiveErrorCopy {
  if (isAdaptiveApiError(error)) {
    if (error.status === 401) {
      return {
        title: "Du må logge inn på nytt",
        message: "Økten din er utløpt. Logg inn igjen og prøv på nytt.",
      };
    }

    if (error.status === 403 && error.code === "upgrade_required") {
      return {
        title: "Premium er ikke synkronisert ennå",
        message:
          "Serveren har ikke låst opp denne premiumfunksjonen ennå. Åpne Innstillinger og trykk Oppdater abonnementsstatus eller Gjenopprett kjøp.",
      };
    }

    if (error.status >= 500) {
      return {
        title: `${resourceLabel(surface)} er midlertidig utilgjengelig`,
        message:
          "Serveren svarte med en feil. Prøv igjen om litt. Hvis det fortsetter må adaptive plan settes opp eller oppdateres på serveren.",
      };
    }

    if (error.message.trim()) {
      return {
        title: `${resourceLabel(surface)} kunne ikke lastes`,
        message: error.message.trim(),
      };
    }
  }

  if (error instanceof TypeError) {
    return {
      title: `${resourceLabel(surface)} kunne ikke lastes`,
      message: "Kunne ikke kontakte serveren. Sjekk nettverket og prøv igjen.",
    };
  }

  return {
    title: `${resourceLabel(surface)} kunne ikke lastes`,
    message: "Prøv igjen om litt.",
  };
}
