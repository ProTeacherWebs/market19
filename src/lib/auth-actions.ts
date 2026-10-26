"use server";

import { redirect } from "next/navigation";
import { userRepository } from "@market/data";
import { auth } from "@/lib/auth/server";
import { mergeGuestCartIntoUser } from "./cart";
import { getSessionUser } from "./session";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  const { error } = await auth.signIn.email({ email, password });
  if (error) {
    redirect(`/${locale}/account/login?error=invalid`);
  }
  const session = await getSessionUser();
  if (session) await mergeGuestCartIntoUser(session.id);
  redirect(`/${locale}/account`);
}

export async function registerAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  if (password.length < 6) redirect(`/${locale}/account/register?error=password`);
  const { error } = await auth.signUp.email({
    email,
    password,
    name: displayName || email.split("@")[0] || "buyer",
  });
  if (error) {
    redirect(`/${locale}/account/register?error=taken`);
  }
  const session = await getSessionUser();
  if (session) await mergeGuestCartIntoUser(session.id);
  redirect(`/${locale}/account`);
}

export async function logoutAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  await auth.signOut();
  redirect(`/${locale}/account/login`);
}

export async function verifyEmailAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const session = await getSessionUser();
  if (!session) redirect(`/${locale}/account/login`);
  await userRepository.updateProfile(session.id, { emailVerified: true });
  redirect(`/${locale}/account?verified=1`);
}

export async function resetPasswordAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const locale = String(formData.get("locale") ?? "ru");
  const { error } = await auth.requestPasswordReset({
    email,
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"}/${locale}/account/login`,
  });
  if (error) redirect(`/${locale}/account/reset?error=missing`);
  redirect(`/${locale}/account/login?reset=1`);
}

export async function updateProfileAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const session = await getSessionUser();
  if (!session) redirect(`/${locale}/account/login`);
  const displayName = String(formData.get("displayName") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  if (displayName) {
    await auth.updateUser({ name: displayName });
  }
  await userRepository.updateProfile(session.id, {
    displayName,
    phone,
    ...(password.length >= 6 ? { password } : {}),
  });
  if (password.length >= 6) {
    // Managed Auth may not allow password change via updateUser; keep mock copy for demos.
  }
  redirect(`/${locale}/account/profile?saved=1`);
}

export async function addAddressAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const session = await getSessionUser();
  if (!session) redirect(`/${locale}/account/login`);
  await userRepository.addAddress(session.id, {
    recipient: String(formData.get("recipient") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    city: String(formData.get("city") ?? ""),
    street: String(formData.get("street") ?? ""),
    isDefault: formData.get("isDefault") === "on",
  });
  redirect(`/${locale}/account/addresses`);
}

export async function toggleFavoriteAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const slug = String(formData.get("slug") ?? "");
  const session = await getSessionUser();
  if (!session) redirect(`/${locale}/account/login`);
  await userRepository.toggleFavorite(session.id, slug);
  const back = String(formData.get("back") ?? `/${locale}/p/${slug}`);
  redirect(back);
}

export async function uploadAvatarAction(formData: FormData) {
  const locale = String(formData.get("locale") ?? "ru");
  const session = await getSessionUser();
  if (!session) redirect(`/${locale}/account/login`);
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    redirect(`/${locale}/account/profile?error=avatar`);
  }
  const { createFilesClient } = await import("./storage");
  const files = createFilesClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const key = `avatars/${session.id}/${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await files.upload(key, bytes, { contentType: file.type || "application/octet-stream" });
  const url = await files.url(key, { expiresIn: 60 * 60 * 24 * 7 });
  await userRepository.updateProfile(session.id, { avatarPath: url });
  await auth.updateUser({ image: url });
  redirect(`/${locale}/account/profile?saved=1`);
}
