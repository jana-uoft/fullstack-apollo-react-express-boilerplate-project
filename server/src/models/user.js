import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const Schema = mongoose.Schema;

const userSchema = new Schema({
    username: String,
    email: String,
    password: String,
    role: String,
    messages: [{type: Schema.Types.ObjectId, ref: 'Message'}]
}, { collection: 'User' });

userSchema.pre('save', async function (next) {
    console.log(this.password);
    this.password = await this.generateHash(this.password)
    next();
});

//unfortunately
/*userSchema.pre('findOneAndUpdate', async function (next) {
    this._update.password = await this.schema.methods.generateHash(this._update.password)
    next();
});*/

userSchema.methods.generateHash = async (password) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

userSchema.methods.validatePassword = async (password, passwordToCompare) =>
    await bcrypt.compare(password, passwordToCompare);

export default mongoose.model('User', userSchema);
