import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  CameraView,
  type BarcodeType,
  useCameraPermissions,
} from "expo-camera";

type QRScannerProps = {
  onScanned: (value: string) => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  scanBoxSize?: number;
  enabled?: boolean;
  barcodeTypes?: BarcodeType[];
};

const DEFAULT_BOX_SIZE = 240;
const DUPLICATE_SCAN_COOLDOWN_MS = 1500;
const PRODUCT_BARCODE_TYPES: BarcodeType[] = [
  "ean13",
  "ean8",
  "upc_a",
  "upc_e",
  "code128",
  "code39",
  "codabar",
  "itf14",
];

export default function QRScanner({
  onScanned,
  onCancel,
  title = "Skann strekkode",
  scanBoxSize = DEFAULT_BOX_SIZE,
  enabled = true,
  barcodeTypes = PRODUCT_BARCODE_TYPES,
}: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraErrorMessage, setCameraErrorMessage] = useState<string | null>(
    null
  );
  const hasScannedRef = useRef(false);
  const lastDeliveredValueRef = useRef<string | null>(null);
  const lastDeliveredAtRef = useRef(0);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    if (!enabled) return;
    hasScannedRef.current = false;
    lastDeliveredValueRef.current = null;
    lastDeliveredAtRef.current = 0;
    setCameraErrorMessage(null);
  }, [enabled]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Sjekker kameratilgang...</Text>
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

  if (cameraErrorMessage) {
    return (
      <View style={styles.center}>
        <Text style={[styles.text, { marginBottom: 20 }]}>
          {cameraErrorMessage}
        </Text>

        {onCancel && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#333" }]}
            onPress={onCancel}
          >
            <Text style={styles.buttonLabel}>Lukk</Text>
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
    if (!enabled) return;

    const nextValue = result.data.trim();
    if (hasScannedRef.current || !nextValue) return;

    const now = Date.now();
    if (
      lastDeliveredValueRef.current === nextValue &&
      now - lastDeliveredAtRef.current < DUPLICATE_SCAN_COOLDOWN_MS
    ) {
      return;
    }

    lastDeliveredValueRef.current = nextValue;
    lastDeliveredAtRef.current = now;
    hasScannedRef.current = true;

    Promise.resolve(onScanned(nextValue)).catch((error) => {
      if (__DEV__) console.log("QRScanner onScanned failed", error);
      hasScannedRef.current = false;
    });
  };

  return (
    <View style={styles.cameraContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes }}
        onMountError={(event) => {
          setCameraErrorMessage(
            event.message || "Kameraet kunne ikke startes. Prøv igjen."
          );
        }}
        onBarcodeScanned={
          enabled && !hasScannedRef.current ? handleScan : undefined
        }
      />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.dim} />
        <View style={styles.middleRow}>
          <View style={styles.dim} />
          <View
            className="scanBox"
            style={[
              styles.scanBox,
              {
                width: scanBoxSize,
                height: scanBoxSize,
                borderRadius: Math.max(16, Math.round(scanBoxSize * 0.08)),
              },
            ]}
          >
            <View
              style={[
                styles.cornerTL,
                getCornerStyle(scanBoxSize, "top", "left"),
              ]}
            />
            <View
              style={[
                styles.cornerTR,
                getCornerStyle(scanBoxSize, "top", "right"),
              ]}
            />
            <View
              style={[
                styles.cornerBL,
                getCornerStyle(scanBoxSize, "bottom", "left"),
              ]}
            />
            <View
              style={[
                styles.cornerBR,
                getCornerStyle(scanBoxSize, "bottom", "right"),
              ]}
            />
          </View>
          <View style={styles.dim} />
        </View>
        <View style={styles.dim} />
      </View>

      {title ? (
        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.titleText}>{title}</Text>
        </View>
      ) : null}
    </View>
  );
}

function getCornerStyle(
  scanBoxSize: number,
  vertical: "top" | "bottom",
  horizontal: "left" | "right"
) {
  const size = Math.max(28, Math.round(scanBoxSize * 0.17));
  const borderRadius = Math.max(8, Math.round(size * 0.2));

  return {
    width: size,
    height: size,
    borderRadius,
    top: vertical === "top" ? -2 : undefined,
    bottom: vertical === "bottom" ? -2 : undefined,
    left: horizontal === "left" ? -2 : undefined,
    right: horizontal === "right" ? -2 : undefined,
  };
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
    borderRadius: 16,
    overflow: "hidden",
  },
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
    borderRadius: 20,
    borderColor: "rgba(255,255,255,0.25)",
    borderWidth: 1,
  },
  cornerTL: {
    position: "absolute",
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
  },
  cornerTR: {
    position: "absolute",
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
  },
  cornerBL: {
    position: "absolute",
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: "white",
  },
  cornerBR: {
    position: "absolute",
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: "white",
  },
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
