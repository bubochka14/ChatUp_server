import randomString from "../tools/randomstring.js"
import mysqlpool from '../mysqlconnector.js'
import ObjectToStringConverter from "../tools/ObjectToStringConverter.js"
import SendableError from "../tools/SendableError.js"
class RoomService
{
    constructor()
    {
        this.pool = mysqlpool
        this.availableRoomTypes=["direct","group"]
    }
    async init()
    {
        let room_info_headers =[], group_rooms_headers =[]
        let res = await mysqlpool.promise().query('SHOW COLUMNS FROM room_info ')
        res.forEach((elem) => room_info_headers.push(elem.Field))
        res = await mysqlpool.promise().query('SHOW COLUMNS FROM group_rooms')
        res.forEach((elem) => group_rooms_headers.push(elem.Field))
        this.roomInfoRegexpConverter = new ObjectToStringConverter({
            keys:room_info_headers
            ,keyPostfix: ' REGEXP '
            ,separator:  ' AND '
        })
        this.groupRegexpConverter = new ObjectToStringConverter({
            keys:group_rooms_headers
            ,keyPostfix: ' REGEXP '
            ,separator:  ' AND '
        })
        this.groupFindConverter = new ObjectToStringConverter({
            keys:group_rooms_headers
            ,keyPostfix: ' = '
            ,separator:  ', '
        })
        this.roomInfoFindConverter = new ObjectToStringConverter({
            keys:group_rooms_headers
            ,keyPostfix: ' = '
            ,separator:  ', '
        })
        group_rooms_headers.shift() //removes id header
        this.groupUpdateConverter = new ObjectToStringConverter({
            keys:group_rooms_headers
            ,keyPostfix: ' = '
            ,separator:  ', '
        })
    }
    async getRoom(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        let [[result]] = await mysqlpool.promise().query(
            "SELECT *\
            FROM room_info \
            JOIN group_rooms ON room_info.id = group_rooms.roomID \
            WHERE id = ?",id);
        delete result.roomId
        return result;
    }
    async addRoom(data)
    {
        let type=data.type || ""
        type = type.toLowerCase()
        if(!this.availableRoomTypes.includes(type))
            throw new TypeError("Unknown room type received")
        let [result] = await mysqlpool.promise().query(
            "INSERT INTO room_info \
            (type) VALUES (?)",type);
        if(type == "group")
        await mysqlpool.promise().query(
            `INSERT INTO group_rooms \
            (roomID,tag,name) VALUES (?)`,
            [[result.insertId,
            data.tag  || "room-"+randomString(4),
            data.name || "unknownRoom"
            ]]);
        return this.getRoom(result.insertId)
    }
    async deleteRoom(id)
    {
        if(typeof id == "undefined" || isNaN(id)) throw new TypeError("Invalid id argument");
        await mysqlpool.promise().query("DELETE FROM room_info WHERE id = ?",id)
    }
    async getRoomByTag(roomTag)
    {
        if(typeof roomTag == "undefined")
            throw new TypeError("Room tag is undefined");
        let [[room]] = await mysqlpool.promise().query("SELECT *,roomID as id FROM group_rooms where tag =?",roomTag)
        return room
    }
    async addUserToRoom(roomID,userID)
    {
        if(isNaN(roomID))throw new TypeError("RoomID is undefined");
        if(isNaN(userID))throw new TypeError("UserID is undefined");
        let [[user]] = await mysqlpool.promise().query("SELECT * FROM room_users where userID =? AND roomID =?",[userID,roomID])
        if(user)
            throw new SendableError("This user already inside the room");
        await mysqlpool.promise().query("INSERT INTO room_users (roomID,userID) VALUES (?)",
            [[roomID,userID]]);
        
    }
    async getRoomUsers(roomID)
    {
        if(isNaN(roomID))throw new TypeError("RoomID is undefined");
        let [users]= await mysqlpool.promise().query(
            "SELECT * FROM room_users  LEFT JOIN user_info ON user_info.id = room_users.userID WHERE roomID = ?",roomID);
        return users;
    }
    async getUserRooms(pattern) 
    {
        if(pattern.userID == undefined || isNaN(pattern.userID))
            throw new TypeError("userID is undefined")
        let searchString = ""
        if(pattern.regexp == true)
        {
            searchString = this.groupRegexpConverter.convert(pattern) 
            if(searchString != "")
                searchString+= " AND " 
            searchString+= this.roomInfoRegexpConverter.convert(pattern)
        }
        else 
        {
            searchString = this.groupFindConverter.convert(pattern) 
            if(searchString != "")
                searchString+= " AND " 
            searchString+= this.roomInfoFindConverter.convert(pattern)
        }
        if(searchString == " AND " )
            return [];
        let [res]= await mysqlpool.promise().query(
            `SELECT ${pattern.format?(pattern.format.toLowerCase() == "minimal"?"id":"*"):"*"}\
            FROM room_info \
            LEFT JOIN room_users ON room_info.id = room_users.roomID \
            LEFT JOIN group_rooms ON room_info.id = group_rooms.roomID\
            left join (SELECT roomID, count(distinct id) as messageCount\
            from room_messages group by roomID) m ON m.roomID = group_rooms.roomID\
            LEFT JOIN message_readings ON room_info.id = message_readings.roomID\
            AND room_users.userID =message_readings.userID\
            WHERE`+ (searchString!=""? `${searchString} AND`:"")+` room_users.userID = ?`
            +(!isNaN(pattern.limit)?` LIMIT ${pattern.limit}`:""),pattern.userID);
        
        return res
    }
    async findRooms(pattern)
    {
        let searchString = ""
        if(pattern.regexp == true)
        {
            searchString = this.groupRegexpConverter.convert(pattern) 
            + " AND " 
            + this.roomInfoRegexpConverter.convert(pattern)
        }
        else 
        {
            searchString = this.groupFindConverter.convert(pattern) 
            + " AND " 
            + this.roomInfoFindConverter.convert(pattern)
        }
        if(searchString == "")
            return;
        let [res]= await mysqlpool.promise().query(
            `SELECT ${pattern.format.toLowerCase() == "minimal"?"id":"*"}\
            FROM room_info \
            JOIN group_rooms ON room_info.id = group_rooms.roomID\
            WHERE ${searchString}`+pattern.limit?`\
            LIMIT ${pattern.limit}`:"",data.userID);
        return res
    }
}
export default RoomService