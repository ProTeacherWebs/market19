import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { createClient, formatUzs } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, ErrorText, Loading, Muted, Screen, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";

type Order = {
  id: string;
  number: string;
  status: string;
  totalUzs: number;
  items: { title: string; quantity: number; lineTotalUzs: number }[];
};

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const auth = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.token) return;
    void (async () => {
      try {
        const res = await createClient().getOrder(id);
        setOrder(res.order as Order);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не найден");
      }
    })();
  }, [auth.token, id]);

  if (!auth.token) {
    return (
      <Screen>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }

  if (!order) return <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: `№ ${order.number}` }} />
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Title>Заказ № {order.number}</Title>
        <Muted>Статус: {order.status}</Muted>
        {order.items.map((item, idx) => (
          <Card key={idx}>
            <Text style={styles.title}>
              {item.title} × {item.quantity}
            </Text>
            <Text style={styles.price}>{formatUzs(item.lineTotalUzs)}</Text>
          </Card>
        ))}
        <Text style={styles.total}>Итого: {formatUzs(order.totalUzs)}</Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontWeight: "600" },
  price: { color: colors.accent, fontWeight: "700" },
  total: { color: colors.text, fontWeight: "700", fontSize: 18 },
});
