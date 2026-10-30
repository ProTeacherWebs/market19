import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { assetUrl, createClient, formatUzs } from "../../src/api";
import { Card, ErrorText, Loading, Muted, Screen, Title } from "../../src/components/ui";
import { colors, radius } from "../../src/theme";

type Category = { slug: string; name: string; description: string; image: string };
type Product = { slug: string; title: string; priceUzs: number; image: string; featured: boolean };

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [featured, setFeatured] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const client = createClient();
        const [cats, products] = await Promise.all([
          client.listCategories(),
          client.listProducts({ page: "1", sort: "new" }),
        ]);
        setCategories((cats.categories as Category[]) ?? []);
        const items = (products.products as Product[]) ?? [];
        setFeatured(items.filter((p) => p.featured).slice(0, 4));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.pad} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Title>Смартфоны и техника для дома</Title>
          <Muted>Каталог с ценами в сумах. Откройте модель и проверьте наличие.</Muted>
          <Link href="/c/smartfony" asChild>
            <Pressable style={styles.cta}>
              <Text style={styles.ctaText}>Смотреть смартфоны</Text>
            </Pressable>
          </Link>
          <Image source={{ uri: assetUrl("/demo/phone.jpg") }} style={styles.heroImage} />
        </View>

        {error && <ErrorText>{error}</ErrorText>}

        <Text style={styles.section}>Категории</Text>
        <View style={styles.grid}>
          {categories.map((c) => (
            <Link key={c.slug} href={`/c/${c.slug}`} asChild>
              <Pressable style={styles.cat}>
                <Image source={{ uri: assetUrl(c.image) }} style={styles.catImage} />
                <Text style={styles.catName}>{c.name}</Text>
              </Pressable>
            </Link>
          ))}
        </View>

        {featured.length > 0 && (
          <>
            <Text style={styles.section}>Избранные модели</Text>
            {featured.map((p) => (
              <Link key={p.slug} href={`/p/${p.slug}`} asChild>
                <Pressable>
                  <Card style={styles.row}>
                    <Image source={{ uri: assetUrl(p.image) }} style={styles.thumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.productTitle}>{p.title}</Text>
                      <Text style={styles.price}>{formatUzs(p.priceUzs)}</Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 16, paddingBottom: 32 },
  hero: { gap: 12 },
  cta: {
    alignSelf: "flex-start",
    backgroundColor: colors.accent,
    borderRadius: radius.control,
    minHeight: 48,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  ctaText: { color: colors.bg, fontWeight: "700" },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  section: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 8,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  cat: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  catImage: { width: "100%", height: 88, backgroundColor: colors.raised },
  catName: { color: colors.text, padding: 10, fontWeight: "600", fontSize: 13 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.raised },
  productTitle: { color: colors.text, fontWeight: "600" },
  price: { color: colors.accent, fontWeight: "700", marginTop: 4 },
});
