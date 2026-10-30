import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { createClient, formatUzs, assetUrl } from "../../src/api";
import { ErrorText, Field, Loading, Muted, Screen } from "../../src/components/ui";
import { Image } from "react-native";
import { colors, radius } from "../../src/theme";

type Product = { slug: string; title: string; priceUzs: number; image: string };

export default function SearchScreen() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        if (!q.trim()) {
          setProducts([]);
          return;
        }
        setLoading(true);
        setError(null);
        try {
          const res = await createClient().listProducts({ q: q.trim(), page: "1" });
          setProducts((res.products as Product[]) ?? []);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Ошибка поиска");
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Screen>
      <Field
        label="Название модели"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        placeholder="Например, Nordline"
      />
      {loading && <Loading />}
      {error && <ErrorText>{error}</ErrorText>}
      {!loading && q.trim() && products.length === 0 && !error && (
        <Muted>Ничего не найдено.</Muted>
      )}
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
    alignItems: "center",
  },
  img: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.raised },
  title: { color: colors.text, fontWeight: "600" },
  price: { color: colors.accent, fontWeight: "700", marginTop: 4 },
});
