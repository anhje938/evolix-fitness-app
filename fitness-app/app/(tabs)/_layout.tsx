// app/(tabs)/_layout.tsx
import { useAuth } from "@/context/AuthProvider";
import { Redirect, Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";

import HomeIcon from "../../assets/icons/home-white.svg";
import FoodIcon from "../../assets/icons/utensils-white.svg";
import WeightIcon from "../../assets/icons/scale-white.svg";
import ExerciseIcon from "../../assets/icons/dumbbell-white.svg";
import { newColors } from "@/config/theme";
import { FoodProvider } from "@/context/FoodProvider";
import { WeightProvider } from "@/context/WeightProvider";

const ACTIVE_COLOR = "rgb(0, 162, 255)";
const INACTIVE_COLOR = "#A0A0A0";
const ACTIVE_BG = "rgba(0, 162, 255, 0.47)";

export default function TabsLayout() {
  const { token, authReady } = useAuth();

  if (!authReady) return <View style={{ flex: 1 }} />;
  if (!token) return <Redirect href="/(auth)/sign-in" />;

  return (
    <WeightProvider>
      <FoodProvider>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarStyle: styles.tabBar,
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                  <HomeIcon
                    width={27}
                    height={27}
                    stroke={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
                    ]}
                  >
                    Hjem
                  </Text>
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="food"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                  <FoodIcon
                    width={27}
                    height={27}
                    stroke={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
                    ]}
                  >
                    Mat
                  </Text>
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="weight"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                  <WeightIcon
                    width={27}
                    height={27}
                    stroke={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
                    ]}
                  >
                    Vekt
                  </Text>
                </View>
              ),
            }}
          />

          <Tabs.Screen
            name="exercise/index"
            options={{
              tabBarIcon: ({ focused }) => (
                <View style={[styles.tabItem, focused && styles.tabItemActive]}>
                  <ExerciseIcon
                    width={27}
                    height={27}
                    stroke={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
                  />
                  <Text
                    style={[
                      styles.tabLabel,
                      { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR },
                    ]}
                  >
                    Trening
                  </Text>
                </View>
              ),
            }}
          />
        </Tabs>
      </FoodProvider>
    </WeightProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: newColors.background.primary,
    marginTop: -20,
    paddingTop: 30,
    borderTopWidth: 0,
    elevation: 0,
    height: 110,
  },
  tabItem: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    minHeight: 60,
  },
  tabItemActive: {
    backgroundColor: ACTIVE_BG,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
});
