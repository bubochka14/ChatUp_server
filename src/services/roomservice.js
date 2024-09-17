var randomString = require("../tools/randomstring")
var mysqlpool = require('../mysqlconnector');
class RoomService
{
    constructor()
    {
        this.pool = mysqlpool
    }
    async addRoom(name, tag ="room-"+randomString(8))
    {
        if(typeof name == "undefined")
            throw new TypeError("Room name is undefined");
        let [result] = await mysqlpool.promise().query(`insert INTO rooms \
             (name,tag) VALUES (?)`,[[name,tag]]);
        let [[room]] = await mysqlpool.promise().query("SELECT * from rooms WHERE id =?",result.insertId);
        return room
    }
    async deleteRoom(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        let [[room]] = await mysqlpool.promise().query("DELETE FROM rooms WHERE id = ?",id)
        return room;
    }
    async  getRoomByTag(roomTag)
    {
        if(typeof roomTag == "undefined")
            throw new TypeError("Room tag is undefined");
        let [[room]] = await mysqlpool.promise().query("SELECT * FROM rooms where tag =?",roomTag)
    return room
    }
    async addUserToRoom(roomID,UserId)
    {
        if(isNaN(roomID) || isNaN(UserId))
            throw new TypeError("RoomID or UserId is undefined");
        await mysqlpool.promise().query("INSERT INTO room_users (roomId,userId) VALUES (?)",
            [[roomID,UserId]]);
    }
    async getRoomUsers(roomID)
    {
        if(typeof roomID == "undefined" || isNaN(roomID))
        throw new TypeError("Room id is undefined");
    let [users] = await mysqlpool.promise().query('SELECT users.id, users.username \
        from room_users JOIN users ON room_users.userId = users.id where \
        room_users.roomId ='+roomID);
    return users
    }
}
module.exports = RoomService