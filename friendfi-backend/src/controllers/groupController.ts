import { Response } from 'express';
import mongoose from 'mongoose';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { createGroup, joinGroup, listGroupsForUser } from '../services/groupService';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  type: z.enum(['general', 'victim-safe-space', 'bully-reflection']).optional().default('general'),
  isPrivate: z.boolean().optional().default(true),
});

const joinSchema = z.object({
  inviteCode: z.string().min(1).max(20),
});

export async function handleCreateGroup(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    const body = createSchema.parse(req.body);
    const group = await createGroup({
      name: body.name,
      description: body.description,
      createdBy: new mongoose.Types.ObjectId(req.userId),
      type: body.type,
      isPrivate: body.isPrivate,
    });
    const g = group.toObject();
    res.status(201).json({
      success: true,
      group: {
        id: (g._id as mongoose.Types.ObjectId).toString(),
        name: g.name,
        description: g.description,
        inviteCode: g.inviteCode,
        members: g.members.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdBy: (g.createdBy as mongoose.Types.ObjectId).toString(),
        type: g.type,
        isPrivate: g.isPrivate,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to create group';
    res.status(400).json({ success: false, error: msg });
  }
}

export async function handleJoinGroup(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  try {
    const body = joinSchema.parse(req.body);
    const group = await joinGroup(body.inviteCode, new mongoose.Types.ObjectId(req.userId));
    if (!group) {
      res.status(404).json({ success: false, error: 'Invalid invite code' });
      return;
    }
    const g = group.toObject();
    res.json({
      success: true,
      group: {
        id: (g._id as mongoose.Types.ObjectId).toString(),
        name: g.name,
        description: g.description,
        inviteCode: g.inviteCode,
        members: g.members.map((id: mongoose.Types.ObjectId) => id.toString()),
        createdBy: (g.createdBy as mongoose.Types.ObjectId).toString(),
        type: g.type,
        isPrivate: g.isPrivate,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to join group';
    res.status(400).json({ success: false, error: msg });
  }
}

export async function handleListMyGroups(req: AuthRequest, res: Response): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const groups = await listGroupsForUser(new mongoose.Types.ObjectId(req.userId));
  res.json({
    success: true,
    groups: groups.map((g) => ({
      id: (g._id as mongoose.Types.ObjectId).toString(),
      name: g.name,
      description: g.description,
      inviteCode: g.inviteCode,
      members: g.members.map((id: mongoose.Types.ObjectId) => id.toString()),
      createdBy: (g.createdBy as mongoose.Types.ObjectId).toString(),
      type: g.type,
      isPrivate: g.isPrivate,
    })),
  });
}
