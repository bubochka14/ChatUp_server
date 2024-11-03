class ObjectToStringConverter{
    constructor(settings)
    {
        this.keys = settings.keys || []
        this.keyPrefix =settings.keyPrefix||""
        this.keyPostfix =settings.keyPostfix||""
        this.entryPostfix =settings.entryPostfix||""
        this.separator = settings.separator || ""
        this.allowEmpty = settings.allowEmpty==undefined?false:settings.allowEmpty
        this.escape = settings.escape || true

    }
convert(object) {
    let out = "";
    for(let i = 0; i< this.keys.length; i++)
    {
        if(object[this.keys[i]]== undefined)
            continue
        if(object[this.keys[i]]=="" && !this.allowEmpty)
            continue
        out+= `${this.keyPrefix}${this.keys[i]}${this.keyPostfix}
        ${(typeof object[this.keys[i]]=== 'string')?
            `\'${object[this.keys[i]].replace(/[?=]/g, "\\?")}\'`
            :`${object[this.keys[i]]}`}
            ${this.entryPostfix}`
            out+=this.separator
    }
    return out.slice(0,out.length-this.separator.length);
}
}
export default ObjectToStringConverter;
