import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text } from "react-native";
import { Link, useRouter } from "expo-router";
import { createClient, formatUzs } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, ErrorText, Loading, Muted, Screen, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";

type Order = { id: string; number: string; status: string; totalUzs: number };

export default function OrdersScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await createClient().listOrders();
        setOrders((res.orders as Order[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, [auth.token]);

  if (!auth.token) {
    return (
      <Screen style={{ gap: 12 }}>
        <Title>Заказы</Title>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (loading) return <Loading />;

  return (
    <Screen>
      <Title>Мои заказы</Title>
      {error && <ErrorText>{error}</ErrorText>}
      {orders.length === 0 && !error && <Muted>Заказов пока нет.</Muted>}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <Link href={`/orders/${item.id}`} asChild>
            <Pressable>
              <Card>
                <Text style={styles.num}>№ {item.number}</Text>
                <Muted>{item.status}</Muted>
                <Text style={styles.price}>{formatUzs(item.totalUzs)}</Text>
              </Card>
            </Pressable>
          </Link>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  num: { color: colors.text, fontWeight: "700" },
  price: { color: colors.accent, fontWeight: "700" },
});
