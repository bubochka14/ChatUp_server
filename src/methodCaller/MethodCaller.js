class MethodCaller 
{
    constructor()
    {
        this.methods = new Map();
    }
    addMethod(key, method) {
        this.methods.set(key,method);
    }
    extractMethods(obj)
    {
        let methods = new Set();
        while (obj = Reflect.getPrototypeOf(obj)) {
        let keys = Reflect.ownKeys(obj)
        keys.forEach((k) => this.methods.set(...k));
        }
    return methods;
    }
    invoke(key,args)
    {
        if(!this.methods.has(key))
            throw new Error("Unknown method received");
        return this.methods.get(key)(...args);
    }
}