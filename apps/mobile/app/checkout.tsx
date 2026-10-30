import { useState } from "react";
import { ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { createClient } from "../src/api";
import { useAuth } from "../src/auth";
import { Button, ErrorText, Field, Muted, Screen, Title } from "../src/components/ui";

export default function CheckoutScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [contact, setContact] = useState(auth.profile?.email ?? "");
  const [recipient, setRecipient] = useState(auth.profile?.displayName ?? "");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Ташкент");
  const [street, setStreet] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!auth.token) {
    return (
      <Screen style={{ gap: 12 }}>
        <Title>Оформление</Title>
        <Muted>Нужна авторизация.</Muted>
        <Button label="Войти" onPress={() => router.push("/login")} />
      </Screen>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await createClient().createOrder({
        contact,
        recipient,
        phone,
        city,
        street,
        idempotencyKey: `m-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      });
      const order = res.order as { id: string };
      router.replace(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка заказа");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 12, paddingBottom: 40 }}>
        <Title>Оформление</Title>
        <Muted>Демо-заказ, оплата при получении. Данные в том же Neon, что сайт.</Muted>
        <Field label="Контакт" value={contact} onChangeText={setContact} autoCapitalize="none" />
        <Field label="Получатель" value={recipient} onChangeText={setRecipient} />
        <Field label="Телефон" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Город" value={city} onChangeText={setCity} />
        <Field label="Адрес" value={street} onChangeText={setStreet} multiline />
        {error && <ErrorText>{error}</ErrorText>}
        <Button label="Подтвердить заказ" disabled={busy} onPress={() => void submit()} />
      </ScrollView>
    </Screen>
  );
}
