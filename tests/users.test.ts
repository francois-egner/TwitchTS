import { expect } from 'chai';
import {TwitchAPI} from "../src";

export const sharedData ={
    broadcasterId: process.env.broadcasterId!,
    moderatorId: process.env.broadcasterId!,
    clientId: process.env.clientId!,
    clientSecret: process.env.clientSecret!,
    userToken: process.env.userToken!,
    differentUserID: process.env.differntUserId!
}


export let apiClient: TwitchAPI;

describe("Users", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Users", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Update User", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get User Block List", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Block User", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Unblock User", async(done)=>{
        done(new Error("Not implemented yet"));
    })
    it("Get User Extensions", async(done)=>{
        done(new Error("Not implemented yet"));
    })
    it("Get User Active Extensions", async(done)=>{
        done(new Error("Not implemented yet"));
    })
})