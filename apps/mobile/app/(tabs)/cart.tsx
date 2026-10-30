import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { createClient, formatUzs } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, Card, ErrorText, Loading, Muted, Screen, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";

type CartItem = {
  variantId: string;
  title: string;
  sku: string;
  quantity: number;
  lineTotalUzs: number;
};

type Cart = { items: CartItem[]; totalUzs: number };

export default function CartScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!auth.token) {
      setCart(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await createClient().getCart();
      setCart(res.cart as Cart);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка корзины");
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!auth.ready || loading) return <Loading />;

  if (!auth.token) {
    return (
      <Screen style={{ gap: 12, justifyContent: "center" }}>
        <Title>Корзина</Title>
        <Muted>Войдите, чтобы видеть ту же корзину, что на сайте.</Muted>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Корзина</Title>
      {error && <ErrorText>{error}</ErrorText>}
      {cart?.items.length === 0 && <Muted>Корзина пуста. Добавьте товар со страницы модели.</Muted>}
      <FlatList
        data={cart?.items ?? []}
        keyExtractor={(item) => item.variantId}
        contentContainerStyle={{ gap: 10, paddingVertical: 12, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <Card>
            <Text style={styles.title}>{item.title}</Text>
            <Muted>{item.sku}</Muted>
            <Text style={styles.price}>{formatUzs(item.lineTotalUzs)}</Text>
            <View style={styles.qty}>
              <Pressable
                style={styles.qtyBtn}
                onPress={() =>
                  void createClient()
                    .setCartItem(item.variantId, Math.max(0, item.quantity - 1))
                    .then((r) => setCart(r.cart as Cart))
                }
              >
                <Text style={styles.qtyText}>−</Text>
              </Pressable>
              <Text style={styles.qtyText}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyBtn}
                onPress={() =>
                  void createClient()
                    .setCartItem(item.variantId, item.quantity + 1)
                    .then((r) => setCart(r.cart as Cart))
                }
              >
                <Text style={styles.qtyText}>+</Text>
              </Pressable>
            </View>
          </Card>
        )}
      />
      {cart && cart.items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.total}>Итого: {formatUzs(cart.totalUzs)}</Text>
          <Link href="/checkout" asChild>
            <Pressable style={styles.checkout}>
              <Text style={styles.checkoutText}>Оформить демо-заказ</Text>
            </Pressable>
          </Link>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.text, fontWeight: "700" },
  price: { color: colors.accent, fontWeight: "700" },
  qty: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
  },
  qtyText: { color: colors.text, fontSize: 16 },
  footer: { gap: 10, paddingBottom: 16 },
  total: { color: colors.text, fontWeight: "700", fontSize: 18 },
  checkout: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutText: { color: colors.bg, fontWeight: "700" },
});
