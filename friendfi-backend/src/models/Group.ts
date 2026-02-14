import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description: string;
  inviteCode: string;
  members: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  type: 'general' | 'victim-safe-space' | 'bully-reflection';
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const GroupSchema = new Schema<IGroup>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    inviteCode: { type: String, required: true, unique: true, uppercase: true, index: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['general', 'victim-safe-space', 'bully-reflection'], default: 'general' },
    isPrivate: { type: Boolean, default: true },
  },
  { timestamps: true }
);

GroupSchema.index({ inviteCode: 1 });
GroupSchema.index({ members: 1 });

export const Group: Model<IGroup> = mongoose.model<IGroup>('Group', GroupSchema);
