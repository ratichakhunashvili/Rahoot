"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { destroyAdminSession, getAdminSession } from "@/lib/session";
import { generateJoinCode } from "@/lib/tokens";

export async function logout() {
  await destroyAdminSession();
  redirect("/admin/login");
}

async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
}

export async function createHomework(formData: FormData) {
  await requireAdmin();

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const mode = String(formData.get("mode") || "ASYNC") as "LIVE" | "ASYNC";

  if (!title) {
    redirect("/admin/homeworks/new?error=title");
  }

  // Join codes are short and drawn from a large alphabet - collisions are
  // rare, but a homework can outlive one, so retry a few times just in case.
  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.homework.findUnique({ where: { joinCode } });
    if (!clash) break;
    joinCode = generateJoinCode();
  }

  const homework = await prisma.homework.create({
    data: {
      title,
      description: description || null,
      mode,
      joinCode,
    },
  });

  revalidatePath("/admin");
  redirect(`/admin/homeworks/${homework.id}`);
}
