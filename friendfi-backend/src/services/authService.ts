import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { User } from '../models';
import type { IUser } from '../models';
import { logger, auditLogger } from '../utils/logger';

const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export interface SignUpInput {
  username: string;
  email: string;
  password: string;
}

export async function signUp(input: SignUpInput): Promise<{ user: Omit<IUser, 'passwordHash'>; token: string }> {
  const existing = await User.findOne({
    $or: [{ email: input.email.toLowerCase() }, { username: input.username }],
  });
  if (existing) {
    if (existing.email === input.email.toLowerCase()) throw new Error('Email already registered');
    throw new Error('Username already taken');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    username: input.username,
    email: input.email.toLowerCase(),
    passwordHash,
    karmaScore: env.INITIAL_KARMA,
  });

  const token = signToken(user._id.toString(), user.email);
  auditLogger.info('User signed up', { userId: user._id, email: user.email });
  const u = user.toObject() as unknown as Record<string, unknown>;
  delete u.passwordHash;
  return { user: u as Omit<IUser, 'passwordHash'>, token };
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function login(input: LoginInput): Promise<{ user: Omit<IUser, 'passwordHash'>; token: string }> {
  const user = await User.findOne({ email: input.email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.passwordHash) throw new Error('Invalid email or password');

  if (user.banned) throw new Error('Account is permanently banned');
  if (user.suspendedUntil && new Date(user.suspendedUntil) > new Date()) {
    throw new Error(`Account suspended until ${(user.suspendedUntil as Date).toISOString()}`);
  }

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) {
    auditLogger.warn('Failed login attempt', { email: input.email });
    throw new Error('Invalid email or password');
  }

  const token = signToken(user._id.toString(), user.email);
  auditLogger.info('User logged in', { userId: user._id });
  const u = user.toObject() as unknown as Record<string, unknown>;
  delete u.passwordHash;
  return { user: u as Omit<IUser, 'passwordHash'>, token };
}

export function signToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );
}

export function verifyToken(token: string): { userId: string; email: string } {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { sub: string; email: string };
    return { userId: decoded.sub, email: decoded.email };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

export async function getProfile(userId: string): Promise<Omit<IUser, 'passwordHash'> | null> {
  const doc = await User.findById(userId).select('-passwordHash').lean();
  return doc as Omit<IUser, 'passwordHash'> | null;
}
