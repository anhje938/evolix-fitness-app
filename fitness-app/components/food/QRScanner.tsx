import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

type QRScannerProps = {
  onScanned: (value: string) => void;
  onCancel?: () => void;
  title?: string;
};

export default function QRScanner({
  onScanned,
  onCancel,
  title = "Skann strekkode",
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();

  // Ref used as a sync lock to prevent multiple rapid scans
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Sjekker kameratilgang…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={[styles.text, { marginBottom: 20 }]}>
          Appen trenger kameratilgang for å skanne strekkoder.
        </Text>

        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonLabel}>Gi tilgang</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#333" }]}
            onPress={onCancel}
          >
            <Text style={styles.buttonLabel}>Avbryt</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const handleScan = (result: {
    data: string;
    type: string;
    cornerPoints?: { x: number; y: number }[];
  }) => {
    // Hard guard: avoid multiple callbacks for the same scan
    if (hasScannedRef.current) return;

    hasScannedRef.current = true;
    onScanned(result.data);
  };

  return (
    <View style={styles.cameraContainer}>
      {/* Camera view; onBarcodeScanned is disabled after first scan via ref */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={hasScannedRef.current ? undefined : handleScan}
      />

      {/* Frame overlay above camera */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.dim} />
        <View style={styles.middleRow}>
          <View style={styles.dim} />
          <View className="scanBox" style={styles.scanBox}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <View style={styles.dim} />
        </View>
        <View style={styles.dim} />
      </View>

      {/* Optional title badge */}
      {title ? (
        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.titleText}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}

const BOX = 240;

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
    borderRadius: 16,
    overflow: "hidden",
  },

  // Overlay above camera
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
  },
  dim: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  middleRow: {
    flexDirection: "row",
  },
  scanBox: {
    width: BOX,
    height: BOX,
    borderRadius: 20,
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
  },
  cornerTL: {
    position: "absolute",
    top: -2,
    left: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
    borderRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 40,
    height: 40,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
    borderRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
    borderRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 40,
    height: 40,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
    borderRadius: 8,
  },

  // Center states
  center: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
  },
  text: {
    color: "white",
    textAlign: "center",
    fontSize: 16,
  },
  button: {
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonLabel: {
    color: "black",
    fontWeight: "600",
  },

  titleOverlay: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  titleText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
