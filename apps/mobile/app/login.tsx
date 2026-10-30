import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../src/auth";
import { Button, ErrorText, Field, Muted, Screen, Title } from "../src/components/ui";

export default function LoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("buyer@velin.demo");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      await auth.login(email.trim(), password);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen style={{ gap: 12 }}>
      <Title>Вход</Title>
      <Muted>Тот же аккаунт, что на сайте. Токен хранится в SecureStore.</Muted>
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
      {error && <ErrorText>{error}</ErrorText>}
      <Button label="Войти" disabled={busy} onPress={() => void onSubmit()} />
    </Screen>
  );
}
