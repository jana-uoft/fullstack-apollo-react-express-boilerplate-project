import mongoose from 'mongoose';

const Schema = mongoose.Schema;

const messageSchema = new Schema({
    createdAt: { type: Date, default: Date.now },
    text: String,
    user: {type: Schema.Types.ObjectId, ref: 'User'}
}, { collection: 'Message' });

export default mongoose.model('Message', messageSchema);
