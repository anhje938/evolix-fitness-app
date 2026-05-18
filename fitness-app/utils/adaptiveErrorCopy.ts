import { isAdaptiveApiError } from "@/api/adaptive";
import type { AppLanguage } from "@/types/userSettings";

type AdaptiveSurface = "plan" | "report";

type AdaptiveErrorCopy = {
  title: string;
  message: string;
};

function text(language: AppLanguage, nb: string, en: string) {
  return language === "en" ? en : nb;
}

function resourceLabel(surface: AdaptiveSurface, language: AppLanguage) {
  if (language === "en") return surface === "report" ? "Report" : "Plan";
  return surface === "report" ? "Rapporten" : "Planen";
}

export function getAdaptiveErrorCopy(
  error: unknown,
  surface: AdaptiveSurface,
  language: AppLanguage = "nb"
): AdaptiveErrorCopy {
  if (isAdaptiveApiError(error)) {
    if (error.status === 401) {
      return {
        title: text(language, "Du må logge inn på nytt", "Sign in again"),
        message: text(
          language,
          "Økten din er utløpt. Logg inn igjen og prøv på nytt.",
          "Your session has expired. Sign in again and try once more."
        ),
      };
    }

    if (error.status === 403 && error.code === "upgrade_required") {
      return {
        title: text(
          language,
          "Premium er ikke synkronisert ennå",
          "Premium is not synced yet"
        ),
        message: text(
          language,
          "Serveren har ikke låst opp denne premiumfunksjonen ennå. Åpne Innstillinger og trykk Oppdater abonnementsstatus eller Gjenopprett kjøp.",
          "The server has not unlocked this premium feature yet. Open Settings and tap Refresh subscription status or Restore purchases."
        ),
      };
    }

    if (error.status >= 500) {
      return {
        title: text(
          language,
          `${resourceLabel(surface, language)} er midlertidig utilgjengelig`,
          `${resourceLabel(surface, language)} is temporarily unavailable`
        ),
        message: text(
          language,
          "Serveren svarte med en feil. Prøv igjen om litt. Hvis det fortsetter må adaptive plan settes opp eller oppdateres på serveren.",
          "The server returned an error. Try again soon. If it continues, the adaptive plan may need setup or an update on the server."
        ),
      };
    }

    if (error.message.trim()) {
      return {
        title: text(
          language,
          `${resourceLabel(surface, language)} kunne ikke lastes`,
          `${resourceLabel(surface, language)} could not load`
        ),
        message: error.message.trim(),
      };
    }
  }

  if (error instanceof TypeError) {
    return {
      title: text(
        language,
        `${resourceLabel(surface, language)} kunne ikke lastes`,
        `${resourceLabel(surface, language)} could not load`
      ),
      message: text(
        language,
        "Kunne ikke kontakte serveren. Sjekk nettverket og prøv igjen.",
        "Could not contact the server. Check the network and try again."
      ),
    };
  }

  return {
    title: text(
      language,
      `${resourceLabel(surface, language)} kunne ikke lastes`,
      `${resourceLabel(surface, language)} could not load`
    ),
    message: text(language, "Prøv igjen om litt.", "Try again soon."),
  };
}
