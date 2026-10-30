import { useEffect, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { assetUrl, createClient } from "../../src/api";
import { ErrorText, Loading, Muted, Screen } from "../../src/components/ui";
import { colors, radius } from "../../src/theme";

type Category = { slug: string; name: string; description: string; image: string };

export default function CatalogScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await createClient().listCategories();
        setCategories((res.categories as Category[]) ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading />;

  return (
    <Screen>
      <Muted>Те же категории, что на сайте Velin.</Muted>
      {error && <ErrorText>{error}</ErrorText>}
      <FlatList
        data={categories}
        keyExtractor={(item) => item.slug}
        contentContainerStyle={{ gap: 10, paddingVertical: 12, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Link href={`/c/${item.slug}`} asChild>
            <Pressable style={styles.row}>
              <Image source={{ uri: assetUrl(item.image) }} style={styles.img} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
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
  img: { width: 72, height: 72, borderRadius: 10, backgroundColor: colors.raised },
  name: { color: colors.text, fontWeight: "700", fontSize: 16 },
  desc: { color: colors.muted, marginTop: 4, fontSize: 13 },
});
