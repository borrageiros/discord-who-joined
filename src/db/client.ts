import { PrismaClient } from "@prisma/client";
import { ensureDataDir } from "../config/env";

ensureDataDir();

export const prisma = new PrismaClient();
