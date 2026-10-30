import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/auth";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "600" },
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="p/[slug]" options={{ title: "Товар" }} />
        <Stack.Screen name="c/[slug]" options={{ title: "Категория" }} />
        <Stack.Screen name="checkout" options={{ title: "Оформление" }} />
        <Stack.Screen name="orders/index" options={{ title: "Заказы" }} />
        <Stack.Screen name="orders/[id]" options={{ title: "Заказ" }} />
        <Stack.Screen name="favorites" options={{ title: "Избранное" }} />
        <Stack.Screen name="login" options={{ title: "Вход", presentation: "modal" }} />
      </Stack>
    </AuthProvider>
  );
}
