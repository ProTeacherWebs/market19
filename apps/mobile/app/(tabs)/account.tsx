import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/auth";
import { Button, Card, Loading, Muted, Screen, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";

export default function AccountScreen() {
  const auth = useAuth();
  const router = useRouter();

  if (!auth.ready) return <Loading />;

  if (!auth.token || !auth.profile) {
    return (
      <Screen style={{ gap: 12 }}>
        <Title>Кабинет</Title>
        <Muted>Вход через тот же backend (Neon Auth / профили сайта).</Muted>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  return (
    <Screen style={{ gap: 12 }}>
      <Title>Кабинет</Title>
      <Card>
        <Text style={styles.name}>{auth.profile.displayName}</Text>
        {auth.profile.email ? <Muted>{auth.profile.email}</Muted> : null}
      </Card>
      <Button label="Мои заказы" ghost onPress={() => router.push("/orders")} />
      <Button label="Избранное" ghost onPress={() => router.push("/favorites")} />
      <Button label="Выйти" ghost onPress={() => void auth.logout()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 18, fontWeight: "700" },
});
