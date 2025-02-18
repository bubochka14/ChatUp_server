
class CallController
{
    #calls
    constructor()
    {
        this.#calls = {}
    }
    get(roomID)
    {
        if(roomID == undefined)
            throw "Invalid roomID received";
        return this.#calls[roomID]
    }
    create(roomID)
    {
        if(roomID == undefined)
            throw "Invalid roomID received";
        this.#calls[roomID]= {users: new Set()}
    }
    async join(userID, roomID)
    {
        if(roomID== undefined)
            throw "Invalid roomID received";
        if(this.#calls[roomID]==undefined)
            this.create(roomID)
        else if (this.#calls[roomID].users.has(userID))
            throw "User already in call"
        this.#calls[roomID].users.add(userID);
        return {"paticipants": Array.from(this.#calls[roomID].users.keys())};
    }
    async disconnect(userID, data)
    {
        if(data.roomID == undefined)
            throw "Invalid roomID received";
        if(this.#calls[data.roomID]!=undefined)
            this.#calls[data.roomID].users.delete(userID);

    }
}
export default CallController