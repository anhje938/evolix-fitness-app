import {
  Dimensions,
  Keyboard,
  Platform,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  type TextInput,
} from "react-native";
import { useCallback, useEffect, useRef, useState } from "react";

export function useKeyboardAwareSheetScroll() {
  const [keyboardInsetHeight, setKeyboardInsetHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const scrollOffsetYRef = useRef(0);
  const keyboardHeightRef = useRef(0);

  const ensureFocusedInputVisible = useCallback(
    (input: TextInput | null, keyboardHeight = keyboardHeightRef.current) => {
      if (!input || !scrollRef.current || keyboardHeight <= 0) return;

      requestAnimationFrame(() => {
        input.measureInWindow((_, y, __, height) => {
          const keyboardTop = Dimensions.get("window").height - keyboardHeight;
          const desiredBottom = keyboardTop - 12;
          const inputBottom = y + height;
          const overlap = inputBottom - desiredBottom;

          if (overlap <= 0) return;

          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollOffsetYRef.current + overlap),
            animated: true,
          });
        });
      });
    },
    []
  );

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextKeyboardHeight = event.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = nextKeyboardHeight;
      setKeyboardInsetHeight(nextKeyboardHeight);
      ensureFocusedInputVisible(focusedInputRef.current, nextKeyboardHeight);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      focusedInputRef.current = null;
      setKeyboardInsetHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [ensureFocusedInputVisible]);

  const handleInputFocus = useCallback(
    (input: TextInput | null) => {
      focusedInputRef.current = input;
      ensureFocusedInputVisible(input);
    },
    [ensureFocusedInputVisible]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  const reset = useCallback(() => {
    keyboardHeightRef.current = 0;
    focusedInputRef.current = null;
    scrollOffsetYRef.current = 0;
    setKeyboardInsetHeight(0);
  }, []);

  return {
    handleInputFocus,
    handleScroll,
    keyboardInsetHeight,
    reset,
    scrollRef,
  };
}
