export function muscleToSlug(m: string): string | null {
  switch (m) {
    case "Bryst": return "chest";

    case "Fremre skulder":
    case "Sideskulder":
    case "Bakre skulder":
      return "deltoids";

    case "Traps": return "trapezius";
    case "Øvre rygg":
    case "Lats":
      return "upper-back";
    case "Nedre rygg":
      return "lower-back";

    case "Biceps":
    case "Brachialis":
      return "biceps";
    case "Triceps":
      return "triceps";
    case "Brachioradialis":
    case "Underarm":
      return "forearm";

    case "Abs": return "abs";
    case "Obliques": return "obliques";

    case "Quadriceps": return "quadriceps";
    case "Hamstrings": return "hamstring";
    case "Rumpe": return "gluteal";
    case "Innside lår":
    case "Utside lår":
      return "adductors";
    case "Bakside legg": return "calves";
    case "Forside legg":
    case "Framside legg":
      return "tibialis";

    // ALL og evt ting du ikke vil vise:
    case "ALL":
    default:
      return null;
  }
}
