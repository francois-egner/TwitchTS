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

describe("Polls", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Polls", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Create Poll", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("End Poll", async(done)=>{
        done(new Error("Not implemented yet"));
    })
})