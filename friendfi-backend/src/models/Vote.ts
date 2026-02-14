import mongoose, { Schema, Document, Model } from 'mongoose';

export type VoteChoice = 'FORGIVE' | 'SANCTION';

export interface IVote extends Document {
  disputeId: mongoose.Types.ObjectId;
  voterId: mongoose.Types.ObjectId;
  vote: VoteChoice;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    voterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vote: { type: String, enum: ['FORGIVE', 'SANCTION'], required: true },
  },
  { timestamps: true }
);

VoteSchema.index({ disputeId: 1, voterId: 1 }, { unique: true });

export const Vote: Model<IVote> = mongoose.model<IVote>('Vote', VoteSchema);
