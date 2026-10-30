import { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { assetUrl, createClient, formatUzs } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Button, ErrorText, Loading, Muted, Screen } from "../../src/components/ui";
import { colors, radius } from "../../src/theme";

type Variant = {
  id: string;
  sku: string;
  label: string;
  priceUzs: number;
  stockQuantity: number;
};

type Product = {
  slug: string;
  title: string;
  description: string;
  image: string;
  variants: Variant[];
  specs?: { label: string; value: string }[];
};

export default function ProductScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const auth = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variantId, setVariantId] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().getProduct(slug);
        const p = res.product as Product;
        setProduct(p);
        setVariantId(p.variants[0]?.id ?? "");
        if (auth.token) {
          const fav = await createClient().listFavorites();
          setFavorite(fav.slugs.includes(slug));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Товар не найден");
      }
    })();
  }, [slug, auth.token]);

  if (!product && !error) return <Loading />;
  if (!product) {
    return (
      <Screen>
        <ErrorText>{error ?? "Не найдено"}</ErrorText>
      </Screen>
    );
  }

  const selected = product.variants.find((v) => v.id === variantId);

  const addToCart = async () => {
    if (!auth.token) {
      router.push("/login");
      return;
    }
    if (!variantId) return;
    setBusy(true);
    setError(null);
    try {
      await createClient().addCartItem(variantId, 1);
      router.push("/(tabs)/cart");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось добавить");
    } finally {
      setBusy(false);
    }
  };

  const toggleFav = async () => {
    if (!auth.token) {
      router.push("/login");
      return;
    }
    try {
      const res = await createClient().toggleFavorite(product.slug);
      setFavorite(res.slugs.includes(product.slug));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка избранного");
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: product.title }} />
      <ScrollView contentContainerStyle={{ gap: 14, paddingBottom: 40 }}>
        <Image source={{ uri: assetUrl(product.image) }} style={styles.image} />
        <Text style={styles.title}>{product.title}</Text>
        <Muted>{product.description}</Muted>
        <View style={{ gap: 8 }}>
          {product.variants.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => setVariantId(v.id)}
              style={[styles.variant, v.id === variantId && styles.variantOn]}
            >
              <Text style={[styles.variantText, v.id === variantId && styles.variantTextOn]}>
                {v.label} · {formatUzs(v.priceUzs)}
              </Text>
            </Pressable>
          ))}
        </View>
        {selected && (
          <Muted>
            SKU {selected.sku} · {selected.stockQuantity > 0 ? "В наличии" : "Нет в наличии"}
          </Muted>
        )}
        {product.specs && product.specs.length > 0 && (
          <View style={{ gap: 6 }}>
            <Text style={styles.specsTitle}>Характеристики</Text>
            {product.specs.map((s) => (
              <Text key={s.label} style={styles.spec}>
                {s.label}: {s.value}
              </Text>
            ))}
          </View>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <Button
          label="В корзину"
          disabled={busy || !selected || selected.stockQuantity < 1}
          onPress={() => void addToCart()}
        />
        <Button
          label={favorite ? "В избранном" : "В избранное"}
          ghost
          onPress={() => void toggleFav()}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: "100%",
    height: 320,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700" },
  variant: {
    minHeight: 48,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  variantOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  variantText: { color: colors.text, fontWeight: "600" },
  variantTextOn: { color: colors.bg },
  specsTitle: { color: colors.text, fontWeight: "700", fontSize: 16 },
  spec: { color: colors.muted },
});
