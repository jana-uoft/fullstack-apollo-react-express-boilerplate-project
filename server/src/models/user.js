import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    username: String,
    email: String,
    hashed_password: {
      type: String,
      default: '',
    },
    role: String,
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  },
  { collection: 'User' },
);

userSchema.virtual('password').set(function(password) {
  this._password = password;
});

userSchema.pre('save', async function(next) {
  if (this._password === undefined) {
    return next();
  }
  this.hashed_password = await this.generateHash(this._password);
  next();
});

userSchema.methods.generateHash = async password => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

userSchema.methods.validatePassword = async (
  password,
  passwordToCompare,
) => await bcrypt.compare(password, passwordToCompare);

export default mongoose.model('User', userSchema);
