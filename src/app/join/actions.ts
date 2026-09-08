"use server";

import { redirect } from "next/navigation";

export async function goToJoinCode(formData: FormData) {
  const raw = String(formData.get("code") || "")
    .trim()
    .toUpperCase();
  if (!raw) {
    redirect("/join?error=empty");
  }
  redirect(`/join/${encodeURIComponent(raw)}`);
}
