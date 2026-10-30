import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack, useLocalSearchParams } from "expo-router";
import { assetUrl, createClient, formatUzs } from "../../src/api";
import { ErrorText, Loading, Muted, Screen } from "../../src/components/ui";
import { colors, radius } from "../../src/theme";

type Product = {
  slug: string;
  title: string;
  priceUzs: number;
  stockQuantity: number;
  image: string;
};

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().listProducts({ category: slug, page: "1" });
        setProducts((res.products as Product[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) return <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: slug }} />
      {error && <ErrorText>{error}</ErrorText>}
      {products.length === 0 && !error && <Muted>В этой категории пока пусто.</Muted>}
      <FlatList
        data={products}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ gap: 10, paddingVertical: 12, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Link href={`/p/${item.slug}`} asChild>
            <Pressable style={styles.row}>
              <Image source={{ uri: assetUrl(item.image) }} style={styles.img} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>{formatUzs(item.priceUzs)}</Text>
                <Muted>{item.stockQuantity > 0 ? "В наличии" : "Нет в наличии"}</Muted>
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
  img: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.raised },
  title: { color: colors.text, fontWeight: "600" },
  price: { color: colors.accent, fontWeight: "700", marginTop: 4 },
});
