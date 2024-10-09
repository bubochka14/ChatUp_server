import assert from 'node:assert/strict';
import { describe, mock, it } from 'node:test';
import ObjectToStringConverter from '../src/tools/ObjectToStringConverter';
describe('WSChatServer tests',()=>{
    describe('Tools tests',()=>{
        it("should covert object to string",()=>{
            let converter = new ObjectToStringConverter({
                keys : ["first","second"]
                ,keyPrefix :"keyPrefix-"
                ,keyPostfix :"-keyPostfix "
                ,entryPostfix :"-entryPostfix"
                ,separator : "-separator-"
                })
                let res = converter.convert({"first":1, "second":"string","third":"third"})
                console.log(res)
        })
    })
})