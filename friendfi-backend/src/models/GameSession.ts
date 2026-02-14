import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IGameSession extends Document {
  players: mongoose.Types.ObjectId[];
  result: Record<string, unknown>;
  xpDistributed: Record<string, number>;
  startedAt: Date;
  endedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    players: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    result: { type: Schema.Types.Mixed, default: {} },
    xpDistributed: { type: Schema.Types.Mixed, default: {} },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

GameSessionSchema.index({ startedAt: -1 });
GameSessionSchema.index({ players: 1 });

export const GameSession: Model<IGameSession> = mongoose.model<IGameSession>(
  'GameSession',
  GameSessionSchema
);
