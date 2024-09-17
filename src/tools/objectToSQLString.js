function objectToSQLString(object) {
    console.log("received",object)
    let out = []; let keys = Object.keys(object)
    for(let i = 0; i< keys.length; i++)
    {
        var entry = keys[i]+" = "
        if(typeof Object.values(object)[i] === 'string')
            entry += ("\'"+Object.values(object)[i]+"\'")
        else entry +=Object.values(object)[i]
        out.push(entry)
    }
    console.log("OUT",out);
    return out;
}
module.exports = objectToSQLString;
