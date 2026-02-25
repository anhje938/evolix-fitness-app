
export const colors = {
    fadeStart: "#380251",
    fadeEnd: "#8B6E98",
    lineColor: "#0F0E0E",
    fullGreen: "#72FF47",
    softGreen: "#2CFC59",
    fullRed: "#FF0707",
    selectedButton: "#e103e9",
    unselectedButton: "rgba(0, 0, 0, 0.13)",
    darkPurpleText: "#6b039b",
    navBarPurple: "#8F8A90",
    primary: "#380251",

}

export const gradient = {
    purple: {
        colors: ["380251", "8B6E98"],
        start: {x: 0, y: 0},
        end: {x: 0, y: 1}
    }, listItem:{
        colors: [
            "rgba(225, 0, 255, 0.66)",
            "rgb(255, 28, 217)",
            "rgba(255, 0, 0, 0.51)",
          ],
          start: { x: 0, y: 0 },
          end: { x: 1, y: 1 }
    }
} as const;

// config/theme.ts

export const newColors = {
    // ===== BACKGROUND =====
    background: {
      primary: "#0f172a",   // slate-900
      secondary: "#172554", // blue-950
      tertiary: "#020617",  // slate-950
      secondary50: "rgba(45, 55, 88, 0.49)",
      secondary80: "rgba(23, 37, 84, 0.8)",

    },
    
  
    // ===== SURFACES / CARDS =====
    surface: {
      glass: "rgba(30, 41, 59, 0.8)", // slate-800/80
      solid: "#1e293b",               // slate-800
      accent: "#1e3a8a",              // blue-900
    },
  
    // ===== PRIMARY ACCENTS (CYAN / BLUE) =====
    primary: {
      main: "#06b6d4",    // cyan-500
      light: "#22d3ee",   // cyan-400
      extraLight: "#67e8f9", // cyan-300
      dark: "#0891b2",    // cyan-600
      blue: "#3b82f6",    // blue-500
      blueDark: "#2563eb", // blue-600
    },
  
    // ===== SECONDARY ACCENTS (TEAL / EMERALD) =====
    secondary: {
      teal: "#14b8a6",       // teal-500
      tealDark: "#0d9488",   // teal-600
      emerald: "#10b981",    // emerald-500
      emeraldLight: "#2dd4bf", // teal-400
    },
  
    // ===== TEXT =====
    text: {
      primary: "#ffffff",
      secondary: "#94a3b8", // slate-400
      muted: "#64748b",     // slate-500
      accent: "#22d3ee",    // cyan-400
    },
  
    // ===== BORDERS =====
    border: {
      subtle: "#334155", // slate-700
      light: "#475569",  // slate-600
      dark: "#1e293b",   // slate-800
      accent: "rgba(6, 182, 212, 0.3)", // cyan-500/30
    },
  
    // ===== SPECIAL =====
    white: "#ffffff",
    black: "#000000",
  };
  
  // ===== OPTIONAL GRADIENTS =====
  
  export const gradients = {
    primary: ["#06b6d4", "#3b82f6"], // cyan → blue
    success: ["#14b8a6", "#10b981"], // teal → emerald
    background: ["#0f172a", "#172554", "#020617"], // dark multi-tone
    primaryWithPurple: ["#06b6d4", "#3b82f6","rgba(216, 54, 181, 0.38)"], // cyan → blue -> purple
  } as const;
  