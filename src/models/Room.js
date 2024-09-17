import mongoose from 'mongoose';
import randomString from '../randomstring';
const Room = new mongoose.Schema({
    name: {type: String, required: true},
    tag: {type: String,default:"room-"+randomString(8)}
})
export default mongoose.model('Room', Room)