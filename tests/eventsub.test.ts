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

describe("EventSub", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Create EventSub Subscription", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Delete EventSub Subscription", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get EventSub Subscriptions", async(done)=>{
        done(new Error("Not implemented yet"));
    })
})