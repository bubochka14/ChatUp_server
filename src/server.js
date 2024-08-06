// сделанный на коленке сервер на вебоскетах для месенджера, без поддержки rest 
const WebSocket  = require('ws');

const SendableError = require('./components/SendableError.js')
const RoomService = require('./services/roomservice.js')
const UserService = require('./services/userservice.js');
const MessageService = require('./services/messageservice.js');

const wss = new WebSocket.Server({port:8000,clientTracking:true})

authorizedUsers = new Map();
serverMethods   = new Map();
authorizedUsers = new Map();

serverMethods.set(registerUser.name, registerUser);
serverMethods.set(loginUser.name, loginUser);
serverMethods.set(addUserToRoom.name, addUserToRoom);
serverMethods.set(getUserInfo.name, getUserInfo);
serverMethods.set(getUserInfoById.name, getUserInfoById);
serverMethods.set(getCurrentUserInfo.name, getCurrentUserInfo);
serverMethods.set(getUserRooms.name, getUserRooms);
serverMethods.set(sendChatMessage.name, sendChatMessage);
serverMethods.set(getRoomHistory.name, getRoomHistory);
serverMethods.set(getRoomUsers.name, getRoomUsers); 

uService = new UserService();
rService = new RoomService();
mService = new MessageService();
wss.on('connection',(ws,req)=> {
    ws.on('error', console.error);
    const ip = req.socket.remoteAddress;
    console.log(ip, ' connected to server')
    ws.on('message',(messageAsString) => {
        if(!messageAsString)
            return
        console.log("Message : \n"  + messageAsString )
        const message  = JSON.parse(messageAsString);
        switch(message.type)
        {
            case "methodCall":
                handleMethodCall(message,ws);
                break;
            default : 
                sendBadResponse(ws,"Unsupported message type: "+ message.type );
                break;
        }
    });
});

function sendSuccessResponse(ws,to,data)
{
    data = data||{};
    data.status = "success";
    data.responseTo = to;
    sendResponse(ws,to,data);
}
function sendBadResponse(ws,responseTo,error="")
{
    var responseData = {status:"error", errorString:error};
    sendResponse(ws,responseTo,responseData);
}
function sendResponse(ws,to, data)
{
    var response = {type: "response", data: data?data:{},messageID:3, ApiVersion:"1.0"};
    response.data.responseTo = to;
    console.log("response", response);
    ws.send(JSON.stringify(response));
}
function handleMethodCall(req,ws)
{       
    method = req.data.method;
    args   = req.data.args;
    messageID = req.messageID
    console.log("arg",args);
    if(method == "registerUser" || method == "loginUser")
    {
        args.push(ws);
    }
    if(!serverMethods.has(method))
    {
        sendBadResponse(ws,messageID,"Unknown method received: "+ method);
        return;
    }
    serverMethods.get(method).apply(null,args)
    .then(result => {sendSuccessResponse(ws,messageID,result)}
    , error=> {
    if(error.sendToUser)
        sendBadResponse(ws,messageID,error.sendToUser);
    else 
        sendBadResponse(ws,messageID,"Server error");
        console.log(error);
    });
}

function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
}
async function loginUser(username, password,ws)
{
    if(!username || !password || username ==" " || password =="")
        throw new SendableError("EmptyCredentials","Attempt to login with null credentials");
    return uService.getUser(username,password)    
    .then(users => {
        if(users.length == 0)
            throw new SendableError("invalidCredentials","Attempt to login with invalid credentials")
        user = users[0];
        generatedToken = uuidv4();
        authorizedUsers.set(generatedToken,{socket:ws, username: username, id:user.ID});
        console.log("Logged user with token " + generatedToken+ " and id: ",user.ID);
        ws.on("close", close => {
            console.log("User deleted with token ",generatedToken);
            authorizedUsers.delete(generatedToken)
        }
            );
        return {userToken:generatedToken};
    });
}
async function registerUser(username, password,ws)
{   
    console.log("mysarg",[username,password]);
    if(!username || !password || username ==" " || password =="")
        throw new SendableError("EmptyCredentials","Attempt to register with null credentials");
    return uService.getUser(username)     
    .then(result => {
        if(result.length > 0)
            throw new SendableError("reregistration","Attempt to register with existed username")
        return uService.addUser(username,password)
    })
    .then(([result,error]) => {
        console.log("result", result);
        generatedToken = uuidv4();
        id = result.insertId;
        authorizedUsers.set(generatedToken,{socket:ws, username: username,id: id});
        console.log("Registred new user with token " + generatedToken+ " and id: ",id);
        addUserToRoom(generatedToken,id,1);
        addUserToRoom(generatedToken,id,2);
        ws.on("close", close => {
            console.log("User deleted with token ",generatedToken);
            authorizedUsers.delete(generatedToken)
        }
            );

        return {userToken:generatedToken};
    });
}


function getRoomUsers(roomID)
{
    return rService.getRoomUsers(roomID)
    .then(results=>{
        console.log(results)
        return {users: results}}
    );
}
async function getUserRooms(id)
{

    return uService.getUserRooms(id)
    .then(results=>{
        console.log(results)
        return {rooms: results}}
    );
}
async function getRoomHistory(userToken,roomID)
{
    return mService.getMessagesHistory(roomID)
    .then(results=>{
        return {messages: results}
    });
}
async function getUserInfo(username)
{
}
async function getUserInfoById(id)
{
}
async function getCurrentUserInfo(userToken)
{
    if(!authorizedUsers.has(userToken))
        throw new SendableError({sendToUser:"Unauthorized attempt get userInfo"});
    return uService.getUserById(authorizedUsers.get(userToken).id)
    .then(
        result=>{
            console.log(result)
            return {id: result.ID, username: result.USERNAME}}
        );
}
async function sendChatMessage(userToken, roomID,chatMessage )
{
    return mService.createMessage(roomID,chatMessage, authorizedUsers.get(userToken).id)
    .then((result)=>{return clientMethodCall([roomID,result]);} );
}
async function clientMethodCall(args,messdata)
{
    var call = {type: "methodCall",data:{args:args}};
    console.log("DEBUG: SOCKETS COUNT ", authorizedUsers.size)
    authorizedUsers.forEach((value,key) => {
        value.socket.send(JSON.stringify(call))
    });
}
async function addUserToRoom(userToken,otherUserID,roomID)
{
    console.log(userToken);
    if(!authorizedUsers.has(userToken))
        throw new Error({sendToUser:"Unauthorized attempt to add user to room"});
    if( isNaN(otherUserID) ||  isNaN(roomID))
        throw "RoomID or UserID unspecified";

    db_pool.promise().query("INSERT INTO room_users (ROOM_ID, USER_ID) VALUES (?)",[[roomID,otherUserID]])
    .then(([result,error])=> {if(error) throw error;} )
}
console.log("server up");

// :)
