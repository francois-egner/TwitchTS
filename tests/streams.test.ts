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

describe("Streams", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Stream Key", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get Streams", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get Followed Streams", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Create Stream Marker", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get Stream Markers", async(done)=>{
        done(new Error("Not implemented yet"));
    })
})