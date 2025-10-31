import mongoose, { Schema, models, model } from 'mongoose'

const MessageSchema = new Schema({
  id: { type: String, required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  videoUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
})

const ChatSchema = new Schema({
  threadId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  messages: { type: [MessageSchema], default: [] },
  userId: { type: String, required: true }, // enforce user-level isolation
  companyId: { type: String, required: true }, // NEW: company-level isolation
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: true } })

export type MessageDoc = mongoose.InferSchemaType<typeof MessageSchema>
export type ChatDoc = mongoose.InferSchemaType<typeof ChatSchema>

export default models.Chat || model('Chat', ChatSchema)


