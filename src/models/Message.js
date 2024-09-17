import mongoose from 'mongoose';
import randomString from '../randomstring';
const Room = new mongoose.Schema({
    userId: {type: Number, required: true},
    roomId: {type: Number, required: true},
    time : { type : Date, required: true}
})
export default mongoose.model('Room', Room)