import bcrypt from "bcryptjs";
import { prisma } from "./db.ts";
import { LOCAL_DEV_USER } from "../../shared/devAuth.ts";

export async function ensureLocalDevUser() {
  const email = LOCAL_DEV_USER.email.toLowerCase();
  const passwordHash = await bcrypt.hash(LOCAL_DEV_USER.password, 10);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, displayName: LOCAL_DEV_USER.displayName },
    create: {
      email,
      passwordHash,
      displayName: LOCAL_DEV_USER.displayName,
    },
  });
}
