import { StyleSheet, Text, View } from "react-native";

type Props = {
  compact?: boolean;
};

export function NonMedicalDisclaimer({ compact = false }: Props) {
  return (
    <View style={[styles.box, compact && styles.boxCompact]}>
      <Text style={[styles.text, compact && styles.textCompact]}>
        Ikke medisinsk råd. Anbefalingene er generell veiledning og erstatter
        ikke helsepersonell.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.16)",
    backgroundColor: "rgba(2,6,23,0.24)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  boxCompact: {
    marginTop: 8,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  text: {
    color: "rgba(203,213,225,0.86)",
    fontSize: 11.5,
    lineHeight: 16,
    fontFamily: "Inter_400Regular",
  },
  textCompact: {
    fontSize: 10.5,
    lineHeight: 15,
  },
});
