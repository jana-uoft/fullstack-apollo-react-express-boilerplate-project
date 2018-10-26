import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    userId: Schema.Types.ObjectId,
    createdAt: { type: Date, default: Date.now },
    text: String,
}, { collection: 'Message' });

export default mongoose.model('Message', messageSchema);
