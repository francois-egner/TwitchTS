import { expect } from 'chai';
import {TwitchAPI} from "../src";

export const sharedData ={
    broadcasterId: process.env.broadcasterId!,
    moderatorId: process.env.broadcasterId!,
    clientId: process.env.clientId!,
    clientSecret: process.env.clientSecret!,
    userToken: process.env.userToken!,
    differentUser:{
        id: process.env.differentUserId!,
        login: process.env.differentUserLogin!,
        displayName: process.env.differentUserDisplayName!
    }
}


export let apiClient: TwitchAPI;

describe("Moderation", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Delete Chat Messages", async(done)=>{
        done(new Error("Not implemented yet"));
    })

    describe("AutoMod", ()=>{

        it("Check AutoMod Status", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Manage Held AutoMod Messages", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Get AutoMod Settings", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Update AutoMod Settings", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("User Ban", ()=>{

        it("Get Banned Users", async()=>{
            const users = await apiClient.getBannedUsers(sharedData.broadcasterId)
            console.log(users)
        })

        it("Ban User", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Unban User", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("Blocked Terms", ()=>{

        it("Get Blocked Terms", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Add Blocked Term", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Remove Blocked Term", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("Moderator Management", ()=>{

        it("Get Moderators", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Add Channel Moderator", async(done)=>{
            done(new Error("Not implemented yet"));
        })

        it("Remove Channel Moderator", async(done)=>{
            done(new Error("Not implemented yet"));
        })
    })

    describe("VIPs", ()=>{

        describe("Get VIPs", ()=>{

            it("Get all VIPs", async ()=>{
                const vips = await apiClient.getVIPs(sharedData.broadcasterId)
                expect(vips).to.not.equal(null);
                expect(vips!.vips).to.be.an("array");
                expect(vips!.vips).to.have.length.above(1);
                expect(vips!.cursor).to.equal(null);

                vips!.vips.forEach((vip)=>{
                    expect(vip).to.haveOwnProperty("id").to.be.a("string")
                    expect(vip).to.haveOwnProperty("login").to.be.a("string")
                    expect(vip).to.haveOwnProperty("displayName").to.be.a("string")
                })
            })

            it("Get one VIP", async ()=>{
                const vips = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: ["812082905"]})
                expect(vips).to.not.equal(null);
                expect(vips!.vips).to.be.an("array");
                expect(vips!.vips).to.have.length(1);
                expect(vips!.cursor).to.equal(null);

                expect(vips!.vips[0]).to.haveOwnProperty("id").to.be.a("string").to.equal(sharedData.differentUser.id)
                expect(vips!.vips[0]).to.haveOwnProperty("login").to.be.a("string").to.equal(sharedData.differentUser.login)
                expect(vips!.vips[0]).to.haveOwnProperty("displayName").to.be.a("string").to.equal(sharedData.differentUser.displayName)

            })
        })


        it("Remove Channel VIP", async()=>{
           await apiClient.removeChannelVIP(sharedData.broadcasterId, sharedData.differentUser.id)
           const result = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: [sharedData.differentUser.id]})


           expect(result).to.equal(null)

        })



        it("Add Channel VIP", async()=>{
            await apiClient.addChannelVIP(sharedData.broadcasterId, sharedData.differentUser.id)
            const result = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: [sharedData.differentUser.id]})

            expect(result).not.to.equal(null);
            expect(result!.vips).to.be.an("array").to.have.length(1);

            expect(result!.vips[0]).to.haveOwnProperty("id").to.be.a("string").to.equal(sharedData.differentUser.id);
            expect(result!.vips[0]).to.haveOwnProperty("login").to.be.a("string").to.equal(sharedData.differentUser.login);
            expect(result!.vips[0]).to.haveOwnProperty("displayName").to.be.a("string").to.equal(sharedData.differentUser.displayName);
        })



        /* it("Should deactivate shield mode", async(done)=>{
             done(new Error("Not implemented yet"));
         })*/
    })

    describe("Shield Mode", ()=>{

        it("Should activate shield mode", async()=>{
            const isActive = await apiClient.updateShieldModeStatus(sharedData.broadcasterId, sharedData.moderatorId, true);
            expect(isActive).to.equal(true);
        })

        it("Should deactivate shield mode", async()=>{
            const isActive = await apiClient.updateShieldModeStatus(sharedData.broadcasterId, sharedData.moderatorId, false);
            expect(isActive).to.equal(false);
        })

        it("Should get the current status", async ()=>{

            const status = await apiClient.getShieldModeStatus(sharedData.broadcasterId, sharedData.moderatorId)

            expect(typeof status == "object").to.equal(true);
            expect(status.isActive).to.be.a("boolean");

            if(status.isActive) {
                expect(status.moderatorId).to.be.a("string");
                expect(status.moderatorLogin).to.be.a("string");
                expect(status.moderatorDisplayName).to.be.a("string");
                expect(status.lastActivatedAt instanceof Date).to.be.equal(true);
            }
        })
    })

})



