
UserService = require("../services/userservice");
class ServerFunctions
{
    constructor(userService)
    {
        this.userService = userService || new UserService()
    } 
async loginUser(username, password,ws)
{
    if(!username || !password || username ==" " || password =="")
        throw new Error("Attempt to login with null credentials",{sendToUser:"Empty credentials"});
    return this.userService.getUser(username,password) 
    .then(users => {
        if(users.length == 0)
            throw new Erorr("Attempt to login with invalid credentials",{sendToUser:"invalidCredentials"})
        user = users[0];
        generatedToken = uuidv4();
        authorizedUsers.set(generatedToken,{socket:ws, username: username, id:user.ID});
        console.log("Logged user with token " + generatedToken+ " and id: ",user.ID);
        return {userToken:generatedToken};
    });
}
async registerUser(username, passw,ws)
{   
    if(!username || !password || username ==" " || password =="")
        throw new Error("Attempt to register with null credentials",{sendToUser:"Empty credentials"});
    return sqlCheckUser(username)     
    .then(result => {
        if(result[0].length > 0)
            throw new Error("Attempt to register with existed username",{sendToUser:"reregistration"})
        return sqlDB.promise().query("INSERT INTO users (USERNAME, PASSWORD) VALUES (?)",[[username,passw]])
    })
    .then(([result,error]) => {
        console.log("result", result);
        generatedToken = uuidv4();
        authorizedUsers.set(generatedToken,{socket:ws, username: username, id});
        console.log("Registred new user with token " + generatedToken+ " and id: ",id);
        return {userToken:generatedToken};
    });
}


async getRoomUsers(userToken, roomID)
{

}
async getCurrentUserRooms(userToken)
{

}
async getRoomHistory(userToken,roomID)
{

}
async  getUserInfo(username)
{
}
async sendChatMessage(userToken, roomID,chatMessage )
{

}
async  addUserToRoom(userToken,otherUserID,roomID)
{
    console.log(userToken);
    if(!authorizedUsers.has(userToken))
        throw new Error({sendToUser:"Unauthorized attempt to add user to room"});
    if( isNaN(otherUserID) ||  isNaN(roomID))
        throw "RoomID or UserID unspecified";

    sqlDB.promise().query("INSERT INTO room_users (ROOM_ID, USER_ID) VALUES (?)",[[roomID,otherUserID]])
    .then(([result,error])=> {if(error) throw error;} )
}

}