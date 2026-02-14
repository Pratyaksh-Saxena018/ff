import mongoose from 'mongoose';
import { Group } from '../models/Group';
import type { IGroup } from '../models/Group';

const INVITE_CODE_LENGTH = 8;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateInviteCode(): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

export async function createGroup(data: {
  name: string;
  description: string;
  createdBy: mongoose.Types.ObjectId;
  type?: IGroup['type'];
  isPrivate?: boolean;
}): Promise<IGroup> {
  let inviteCode = generateInviteCode();
  let exists = await Group.findOne({ inviteCode });
  while (exists) {
    inviteCode = generateInviteCode();
    exists = await Group.findOne({ inviteCode });
  }
  const group = await Group.create({
    name: data.name.trim(),
    description: (data.description ?? '').trim(),
    inviteCode,
    members: [data.createdBy],
    createdBy: data.createdBy,
    type: data.type ?? 'general',
    isPrivate: data.isPrivate ?? true,
  });
  return group;
}

export async function joinGroup(
  inviteCode: string,
  userId: mongoose.Types.ObjectId
): Promise<IGroup | null> {
  const code = inviteCode.trim().toUpperCase();
  const group = await Group.findOne({ inviteCode: code });
  if (!group) return null;
  if (group.members.some((id) => id.equals(userId))) return group;
  group.members.push(userId);
  await group.save();
  return group;
}

export async function listGroupsForUser(userId: mongoose.Types.ObjectId) {
  return Group.find({ members: userId })
    .populate('createdBy', 'username')
    .sort({ updatedAt: -1 })
    .lean();
}

export async function getGroupById(groupId: string): Promise<IGroup | null> {
  if (!mongoose.Types.ObjectId.isValid(groupId)) return null;
  return Group.findById(groupId).lean() as Promise<IGroup | null>;
}
