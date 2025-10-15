import mongoose from 'mongoose'

let isConnected = 0

export async function connectToDatabase() {
  if (isConnected) return
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI is not set')
  const conn = await mongoose.connect(uri, { dbName: process.env.MONGODB_DATABASE || undefined })
  isConnected = conn.connections[0].readyState
}


