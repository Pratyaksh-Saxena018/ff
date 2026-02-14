import mongoose, { Schema, Document, Model } from 'mongoose';

export type AITranscriptRole =
  | 'BULLY'
  | 'VICTIM'
  | 'SENTINEL'
  | 'MEDIATOR'
  | 'CLERK'
  | 'VALIDATOR';
export type AIProvider = 'OPENAI' | 'GEMINI' | 'CLAUDE' | 'PERPLEXITY';

export interface IAITranscript extends Document {
  disputeId: mongoose.Types.ObjectId;
  role: AITranscriptRole;
  provider: AIProvider;
  input: string;
  output: string;
  tokensUsed: number;
  createdAt: Date;
}

const AITranscriptSchema = new Schema<IAITranscript>(
  {
    disputeId: { type: Schema.Types.ObjectId, ref: 'Dispute', required: true, index: true },
    role: {
      type: String,
      enum: ['BULLY', 'VICTIM', 'SENTINEL', 'MEDIATOR', 'CLERK', 'VALIDATOR'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['OPENAI', 'GEMINI', 'CLAUDE', 'PERPLEXITY'],
      required: true,
    },
    input: { type: String, required: true },
    output: { type: String, required: true },
    tokensUsed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AITranscriptSchema.index({ disputeId: 1, createdAt: 1 });

export const AITranscript: Model<IAITranscript> = mongoose.model<IAITranscript>(
  'AITranscript',
  AITranscriptSchema
);
