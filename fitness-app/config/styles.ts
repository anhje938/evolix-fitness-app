// config/styles.ts
import { StyleSheet } from "react-native";

/**
 * General/shared styles used across the app.
 * NOTE: You import this as: import { generalStyles } from "@/config/styles";
 */
export const generalStyles = StyleSheet.create({
  container: {
    padding: 20,
    paddingTop: 100,
    width: "100%",
  },

  // Legacy card (kept as-is from your snippet)
  card: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.31)",
    borderColor: "rgba(95, 63, 63, 0.22)",
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: "purple",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
  },

  // Used in meal sheet modal
  mealSheetContainer: {
    padding: 10,
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 0,
    shadowColor: "purple",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 1,
    opacity: 1,
    backgroundColor: "white",
  },

  listItem: {
    // (intentionally empty — add shared list item styling here later)
  },

  /**
   * ✅ Your new "ocean" card style used in Home/Food etc.
   * You already reference this as: generalStyles.newCard
   */
  newCard: {
    borderWidth: 0.2,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    borderColor: "rgba(6, 182, 212, 0.12)", // cyan-ish
  },

  
});
