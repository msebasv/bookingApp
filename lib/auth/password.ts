import bcrypt from "bcryptjs";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/constants";

const BCRYPT_COST = 12;

export function passwordIsLongEnough(password: string) {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function passwordMatches(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}
