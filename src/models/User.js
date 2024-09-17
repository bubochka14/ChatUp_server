import mongoose from 'mongoose';
import randomString from '../randomstring';
const User = new mongoose.Schema({
    login: {type: String, required: true},
    password: {type: String, required: true},
    name: {type: String,default:"user-"+randomString(8)}
})
export default mongoose.model('User', User)