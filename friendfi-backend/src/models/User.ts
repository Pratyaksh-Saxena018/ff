import mongoose, { Schema, Document, Model } from 'mongoose';

export type JuryRank = 'Observer' | 'Juror' | 'SeniorJuror' | 'Guardian';

export interface IReputationHistoryEntry {
  timestamp: Date;
  delta: number;
  reason: string;
}

export interface IUser extends Document {
  username: string;
  email: string;
  passwordHash: string;
  karmaScore: number;
  juryAccuracy: number;
  gameXP: number;
  juryRank: JuryRank;
  totalCasesParticipated: number;
  totalSanctionsReceived: number;
  totalApologiesGiven: number;
  reputationHistory: IReputationHistoryEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const ReputationHistoryEntrySchema = new Schema<IReputationHistoryEntry>(
  {
    timestamp: { type: Date, default: Date.now },
    delta: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    karmaScore: { type: Number, default: 500, index: true },
    juryAccuracy: { type: Number, default: 0 },
    gameXP: { type: Number, default: 0 },
    juryRank: {
      type: String,
      enum: ['Observer', 'Juror', 'SeniorJuror', 'Guardian'],
      default: 'Observer',
      index: true,
    },
    totalCasesParticipated: { type: Number, default: 0 },
    totalSanctionsReceived: { type: Number, default: 0 },
    totalApologiesGiven: { type: Number, default: 0 },
    reputationHistory: {
      type: [ReputationHistoryEntrySchema],
      default: [],
      select: false,
    },
  },
  { timestamps: true }
);

UserSchema.index({ karmaScore: -1 });
UserSchema.index({ juryRank: 1 });
UserSchema.index({ gameXP: -1 });

export const User: Model<IUser> = mongoose.model<IUser>('User', UserSchema);
