
class CallController
{
    #calls
    #userCache
    constructor()
    {
        this.#calls = {}
        this.#userCache =  new Map()
    }
    get(roomID)
    {
        if(roomID == undefined || !this.#calls.has(roomID))
            throw "Invalid roomID received";
        return this.#calls[roomID]
    }
    create(roomID)
    {
        if(roomID == undefined)
            throw "Invalid roomID received";
        this.#calls[roomID]= {users: new Map()}
    }
    async join(userID, roomID)
    {
        if(roomID== undefined)
            throw "Invalid roomID received";
        if(this.#calls[roomID]==undefined)
            this.create(roomID)
        else if (this.#calls[roomID].users.has(userID))
            throw "User already in this call"
        if(this.#userCache.get(userID)!= undefined)
            throw "User already in another call"
        this.#calls[roomID].users.set(userID,{audio:false,video:false});
        this.#userCache.set(userID, roomID)
        return {"paticipants": Array.from(this.#calls[roomID].users.keys())};
    }
    async disconnect(userID)
    {
        var roomID = this.#userCache.get(userID)
        if(roomID == undefined)
            return;
        if(this.#calls[roomID]!=undefined)
        {    
            this.#calls[roomID].users.delete(userID);
            this.#userCache.delete(userID)
        }
    }
    async getUserCall(userID)
    {
        return this.#userCache.get(userID)
    }
    async setMedia(roomID,userID,video,audio)
    {
        if(roomID == undefined || this.#calls[roomID]== undefined)
            throw "Invalid roomID received";
        if (!this.#calls[roomID].users.has(userID))
            throw "User not inside the call"
        let media = this.#calls[roomID].users.get(userID)
        if(video!=undefined)
            media.video =video 
        if(audio!=undefined)
            media.audio =audio 
        this.#calls[roomID].users.set(roomID,media)
        return media
    }
}
export default CallController