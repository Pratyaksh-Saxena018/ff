import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IChatMessage extends Document {
  roomId: string;
  senderId: mongoose.Types.ObjectId;
  message: string;
  toxicityScore: number | null;
  flagged: boolean;
  createdAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    roomId: { type: String, required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    toxicityScore: { type: Number, default: null },
    flagged: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ChatMessageSchema.index({ roomId: 1, createdAt: -1 });

export const ChatMessage: Model<IChatMessage> = mongoose.model<IChatMessage>(
  'ChatMessage',
  ChatMessageSchema
);
