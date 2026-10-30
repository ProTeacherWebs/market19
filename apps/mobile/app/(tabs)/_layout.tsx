import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../src/theme";

function TabLabel({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text style={{ color: focused ? colors.text : colors.muted, fontSize: 11, fontWeight: "600" }}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Velin",
          tabBarLabel: ({ focused }) => <TabLabel label="Главная" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="catalog"
        options={{
          title: "Каталог",
          tabBarLabel: ({ focused }) => <TabLabel label="Каталог" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Поиск",
          tabBarLabel: ({ focused }) => <TabLabel label="Поиск" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Корзина",
          tabBarLabel: ({ focused }) => <TabLabel label="Корзина" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Кабинет",
          tabBarLabel: ({ focused }) => <TabLabel label="Кабинет" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
