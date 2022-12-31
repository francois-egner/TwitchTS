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

describe("Schedule", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Channel Stream Schedule", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Get Channel iCalendar", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Update Channel Stream Schedule", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Create Channel Stream Schedule Segment", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Update Channel Stream Schedule Segment", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Delete Channel Stream Schedule Segment", async(done)=>{
        done(new Error("Not implemented yet"));
    })
})