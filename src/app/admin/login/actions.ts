"use server";

import { redirect } from "next/navigation";
import { verifyAdminCredentials, createAdminSession } from "@/lib/session";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const from = String(formData.get("from") || "/admin");

  if (!verifyAdminCredentials(email, password)) {
    const url = new URL("/admin/login", "http://internal");
    url.searchParams.set("error", "invalid");
    if (from && from !== "/admin") url.searchParams.set("from", from);
    redirect(url.pathname + url.search);
  }

  await createAdminSession(email);
  redirect(from.startsWith("/admin") ? from : "/admin");
}
