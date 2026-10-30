import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { assetUrl, createClient, formatUzs } from "../src/api";
import { useAuth } from "../src/auth";
import { Button, ErrorText, Loading, Muted, Screen, Title } from "../src/components/ui";
import { colors, radius } from "../src/theme";

type Product = { slug: string; title: string; priceUzs: number; image: string };

export default function FavoritesScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await createClient().listFavorites();
        setProducts((res.products as Product[]) ?? []);
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
        <Title>Избранное</Title>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  if (loading) return <Loading />;

  return (
    <Screen>
      <Title>Избранное</Title>
      {error && <ErrorText>{error}</ErrorText>}
      {products.length === 0 && !error && <Muted>Пока пусто.</Muted>}
      <FlatList
        data={products}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <Link href={`/p/${item.slug}`} asChild>
            <Pressable style={styles.row}>
              <Image source={{ uri: assetUrl(item.image) }} style={styles.img} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>{formatUzs(item.priceUzs)}</Text>
              </View>
            </Pressable>
          </Link>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  img: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.raised },
  title: { color: colors.text, fontWeight: "600" },
  price: { color: colors.accent, fontWeight: "700", marginTop: 4 },
});
