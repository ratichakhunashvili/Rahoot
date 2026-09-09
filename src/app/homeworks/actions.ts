"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateJoinCode, generateClientToken } from "@/lib/tokens";
import { setCreatorCookie } from "@/lib/creator-session";

// Public, no-registration homework creation. Anyone can call this - the
// only thing that ties the resulting homework back to its creator is the
// creatorToken minted here and stashed in their session cookie (see
// creator-session.ts / homework-auth.ts), the same trust model the app
// already uses for students.
export async function createHomework(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const mode = String(formData.get("mode") || "ASYNC") as "LIVE" | "ASYNC";

  if (!title) {
    redirect("/homeworks/new?error=title");
  }

  // Join codes are short and drawn from a large alphabet - collisions are
  // rare, but a homework can outlive one, so retry a few times just in case.
  let joinCode = generateJoinCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const clash = await prisma.homework.findUnique({ where: { joinCode } });
    if (!clash) break;
    joinCode = generateJoinCode();
  }

  const creatorToken = generateClientToken();

  const homework = await prisma.homework.create({
    data: {
      title,
      description: description || null,
      mode,
      joinCode,
      creatorToken,
    },
  });

  await setCreatorCookie(homework.id, creatorToken);

  redirect(`/homeworks/${homework.id}`);
}
