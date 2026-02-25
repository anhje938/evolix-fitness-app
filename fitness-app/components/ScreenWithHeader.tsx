import { ReactNode } from "react";
import { View, StyleSheet, ScrollView } from "react-native";

type Props = {
  title: string;
  children?: ReactNode;
  footer?: ReactNode;
  headerColors?: readonly [string, string] | readonly [string, string, string];
  backgroundColor?: string;
};

export default function ScreenWithHeader({
  title,
  children,
  footer,
  backgroundColor,
}: Props) {
  return (
    <View style={[styles.screen, backgroundColor && { backgroundColor }]}>
      {/* INGEN HEADER LENGER */}

      {/* Scrollable content */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {/* Optional footer */}
      {footer && <View style={styles.footerContainer}>{footer}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  content: {
    padding: 24,
    paddingBottom: 140,
    alignItems: "center",
  },
  footerContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
});
