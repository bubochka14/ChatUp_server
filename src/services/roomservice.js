var mysqlpool = require('../mysqlconnector');

class RoomService
{
    constructor()
    {
        this.pool = mysqlpool
    }
    async addRoom()
    {

    }
    async removeRoom()
    {
        
    }
    async addUserToRoom(roomID,UserId)
    {
        
    }
    async getRoomUsers(roomID)
    {
        if(typeof roomID == "undefined" || isNaN(roomID))
        throw new TypeError("Room id is undefined");
    return this.pool.promise().query('select users.ID, users.USERNAME \
        from room_users JOIN users ON room_users.USER_ID = users.ID where \
        room_users.ROOM_ID ='+roomID)
    .then(([rows,fields])=> {return rows;} );
    }
}
module.exports = RoomService