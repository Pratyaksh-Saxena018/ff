import mongoose, { Schema, Document, Model } from 'mongoose';

export type TriggerType = 'AI' | 'USER_REPORT';
export type DisputeStatus = 'INVESTIGATING' | 'READY_FOR_VOTE' | 'CLOSED';
export type FinalVerdict = 'FORGIVE' | 'SANCTION' | null;
export type SanctionType = 'MUTE' | 'FINE' | 'WARNING' | null;

export interface IAISummary {
  intentClassification?: string;
  harmLevel?: number;
  remorseProbability?: number;
  apologyOffered?: boolean;
  contextSummary?: string;
}

export interface IDispute extends Document {
  caseNumber: string;
  bullyId: mongoose.Types.ObjectId;
  victimId: mongoose.Types.ObjectId;
  roomId: string;
  triggerType: TriggerType;
  aiConfidence: number;
  status: DisputeStatus;
  aiSummary: IAISummary | null;
  finalVerdict: FinalVerdict;
  sanctionType: SanctionType;
  remorseScore: number;
  harmLevel: number;
  apologyOffered: boolean;
  createdAt: Date;
  closedAt: Date | null;
}

const DisputeSchema = new Schema<IDispute>(
  {
    caseNumber: { type: String, required: true, unique: true },
    bullyId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    victimId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    roomId: { type: String, required: true },
    triggerType: { type: String, enum: ['AI', 'USER_REPORT'], required: true },
    aiConfidence: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['INVESTIGATING', 'READY_FOR_VOTE', 'CLOSED'],
      default: 'INVESTIGATING',
      index: true,
    },
    aiSummary: { type: Schema.Types.Mixed, default: null },
    finalVerdict: { type: String, enum: ['FORGIVE', 'SANCTION'], default: null },
    sanctionType: { type: String, enum: ['MUTE', 'FINE', 'WARNING'], default: null },
    remorseScore: { type: Number, default: 0 },
    harmLevel: { type: Number, default: 0 },
    apologyOffered: { type: Boolean, default: false },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DisputeSchema.index({ status: 1 });
DisputeSchema.index({ createdAt: -1 });
DisputeSchema.index({ bullyId: 1, status: 1 });
DisputeSchema.index({ victimId: 1, status: 1 });

export const Dispute: Model<IDispute> = mongoose.model<IDispute>('Dispute', DisputeSchema);
