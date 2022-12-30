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

describe("Chat", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Chatters", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    it("Send Chat Announcement", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    describe("Campaign", ()=>{
        it("Get Charity Campaign", async(done)=>{
            done(new Error("Not implemented yet"));
        })

         it("Get Charity Campaign Donations", async(done)=> {
             done(new Error("Not implemented yet"));
         })
    })

    describe("Emotes", ()=>{

        it("Get Channel Emotes", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Get Global Emotes", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Get Emote Sets", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("Badges", ()=>{
        it("Get Channel Chat Badges", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Get Global Chat Badges", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("Settings", ()=>{
        it("Get Chat Settings", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Update Chat Settings", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("User Chat Color", ()=>{
        it("Get User Chat Color", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Update User Chat Color", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })
})



