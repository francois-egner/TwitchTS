import { expect } from 'chai';
import {TwitchAPI} from "../src";

export const sharedData = {
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

    //TODO: Add test for single message somehow
    it("Delete Chat Messages", async()=>{
        await apiClient.deleteChatMessages(sharedData.broadcasterId, sharedData.moderatorId)
    })

    describe("AutoMod", ()=>{

        it("Get AutoMod Settings", async()=>{
            const autoModStatus = await apiClient.getAutoModSettings(sharedData.broadcasterId, sharedData.moderatorId);
            expect(typeOf(autoModStatus)).to.be.oneOf(["object", "null"])

            if(autoModStatus !== null){
                console.log(autoModStatus)
                expect(autoModStatus).to.haveOwnProperty("broadcasterId").to.be.a("string")
                expect(autoModStatus).to.haveOwnProperty("moderatorId").to.be.a("string")

                expect(autoModStatus).to.haveOwnProperty("overallLevel")
                expect(typeOf(autoModStatus.overallLevel)).to.be.oneOf(["number", "null"])
                expect(autoModStatus).to.haveOwnProperty("disability").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("aggression").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("sexualitySexOrGender").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("misogyny").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("bullying").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("swearing").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("raceEthnicityOrReligion").to.be.a("number").above(-1)
                expect(autoModStatus).to.haveOwnProperty("sexBasedTerms").to.be.a("number").above(-1)
            }
        })

        //TODO: Automate Manage Held AutoMod Messages somehow
        it("Manage Held AutoMod Messages", async()=>{
        })

        //TODO: Automate Check AutoMod Status
        it("Check AutoMod Status", async()=>{
        })

        it("Update AutoMod Settings", async()=>{
            const result = await apiClient.updateAutoModSettings(sharedData.broadcasterId, sharedData.moderatorId,{
                disability: 3,
                aggression: 3,
                sexualitySexOrGender: 2,
                misogyny: 2,
                bullying: 1,
                swearing: 1
            })

            expect(result).to.be.an("object")
            expect(result).to.haveOwnProperty("broadcasterId").to.be.a("string").to.be.equal(sharedData.broadcasterId)
            expect(result).to.haveOwnProperty("moderatorId").to.be.a("string").to.be.equal(sharedData.moderatorId)

            expect(result).to.haveOwnProperty("overallLevel");
            expect(typeOf(result.overallLevel)).to.be.oneOf(["number", "null"])
            expect(result).to.haveOwnProperty("disability").to.be.a("number").to.be.equal(3)
            expect(result).to.haveOwnProperty("aggression").to.be.a("number").to.be.equal(3)
            expect(result).to.haveOwnProperty("sexualitySexOrGender").to.be.a("number").to.be.equal(2)
            expect(result).to.haveOwnProperty("misogyny").to.be.a("number").to.be.equal(2)
            expect(result).to.haveOwnProperty("bullying").to.be.a("number").to.be.equal(1)
            expect(result).to.haveOwnProperty("swearing").to.be.a("number").to.be.equal(1)
            expect(result).to.haveOwnProperty("raceEthnicityOrReligion").to.be.a("number").to.be.equal(0)
            expect(result).to.haveOwnProperty("sexBasedTerms").to.be.a("number").to.be.equal(0)
        })
    })

    describe("User Ban", ()=>{

        after(()=>{
            apiClient.unbanUser(sharedData.broadcasterId, sharedData.moderatorId, sharedData.differentUser.id)
        })

        it("Get Banned Users", async()=>{
            const usersData = await apiClient.getBannedUsers(sharedData.broadcasterId)
            expect(typeOf(usersData)).to.be.oneOf(["object", "null"])
            if(usersData !== null){
                expect(usersData?.bannedUsers).to.be.an("array")
                expect(usersData.cursor).to.equal(null);
            }
        })

        it("Ban User indefinetly", async()=>{
            const result = await apiClient.banUser(sharedData.broadcasterId, sharedData.moderatorId, sharedData.differentUser.id, {reason: "You were a bad boy!"});
            expect(result.broadcasterId).to.be.equal(sharedData.broadcasterId)
            expect(result.moderatorId).to.be.equal(sharedData.moderatorId)
            expect(result.endTime.toISOString()).to.eq(new Date(0).toISOString());
        })

        it("Unban User", async()=>{
            await apiClient.unbanUser(sharedData.broadcasterId, sharedData.moderatorId, sharedData.differentUser.id)
        })

        it("Ban User for 2 Weeks", async()=>{
            const result = await apiClient.banUser(sharedData.broadcasterId, sharedData.moderatorId, sharedData.differentUser.id, {duration: 1209600});
            expect(result.broadcasterId).to.be.equal(sharedData.broadcasterId)
            expect(result.moderatorId).to.be.equal(sharedData.moderatorId)
            expect(result.createdAt).to.be.a("date")
            expect(result.endTime).to.be.a("date")
            expect(result.endTime.getTime() - result.createdAt.getTime()).to.equal(1000 * 60 * 60 * 24 * 14)
        })


    })

    describe("Blocked Terms", ()=>{
        const randomString = makeid(20);
        let termId = "";
        it("Get Blocked Terms", async()=>{
            const terms = await apiClient.getBlockedTerms(sharedData.broadcasterId, sharedData.moderatorId)

            expect(typeOf(terms)).is.oneOf(["null","object"])

            if(terms !== null){
                expect(terms.terms).is.an("array")
                expect(terms.terms[0]).has.ownProperty("broadcasterId").to.be.a("string")
                expect(terms.terms[0]).has.ownProperty("moderatorId").to.be.a("string")
                expect(terms.terms[0]).has.ownProperty("id").to.be.a("string")
                expect(terms.terms[0]).has.ownProperty("text").to.be.a("string")

                expect(terms.terms[0]).has.ownProperty("createdAt").to.be.a("date")
                expect(terms.terms[0]).has.ownProperty("updatedAt").to.be.a("date")
                expect(terms.terms[0]).has.ownProperty("expiresAt").to.be.a("date")
            }
        })

        it("Add Blocked Term", async()=>{
            const term = await apiClient.addBlockedTerm(sharedData.broadcasterId, sharedData.moderatorId, randomString);
            expect(term).has.ownProperty("broadcasterId").to.be.a("string")
            expect(term).has.ownProperty("moderatorId").to.be.a("string")
            expect(term).has.ownProperty("id").to.be.a("string")
            termId = term.id;
            expect(term).has.ownProperty("text").to.be.a("string")

            expect(term).has.ownProperty("createdAt").to.be.a("date")
            expect(term).has.ownProperty("updatedAt").to.be.a("date")
            expect(term).has.ownProperty("expiresAt").to.be.a("date")
        })

        it("Remove Blocked Term", async()=>{
            await apiClient.removeBlockedTerm(sharedData.broadcasterId, sharedData.moderatorId, termId)
        })
    })

    describe("Moderator Management", ()=>{

        it("Get Moderators", async()=>{
            const mods = await apiClient.getModerators(sharedData.broadcasterId)
            expect(typeOf(mods)).to.be.oneOf(["object", "null"])

            if(mods !== null){
                expect(mods.moderators).to.be.an("array")
                mods.moderators.forEach((moderator)=> {
                    expect(moderator).to.haveOwnProperty("id").to.be.a("string");
                    expect(moderator).to.haveOwnProperty("login").to.be.a("string");
                    expect(moderator).to.haveOwnProperty("displayName").to.be.a("string");
                })
            }
        })

        it("Add Channel Moderator", async()=>{
            await apiClient.addChannelModerator(sharedData.broadcasterId, sharedData.differentUser.id)
            const modsData = await apiClient.getModerators(sharedData.broadcasterId);
            expect(modsData?.moderators).to.be.an("array")
            expect(modsData!.moderators.map((moderator)=>moderator.id).includes(sharedData.differentUser.id)).to.be.equal(true, "New moderator is not part of the newly fetched mods list!")
        })

        it("Remove Channel Moderator", async()=>{
            await apiClient.removeChannelModerator(sharedData.broadcasterId, sharedData.differentUser.id)
            const modsData = await apiClient.getModerators(sharedData.broadcasterId);
            expect(modsData?.moderators).to.be.an("array")
            expect(modsData!.moderators.map((moderator)=>moderator.id).includes(sharedData.differentUser.id)).to.be.equal(false, "New moderator is not part of the newly fetched mods list!")

        })
    })

    describe("VIPs", ()=>{

        it("Add Channel VIP", async()=>{
            await apiClient.addChannelVIP(sharedData.broadcasterId, sharedData.differentUser.id)
            const result = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: [sharedData.differentUser.id]})

            expect(result).not.to.equal(null);
            expect(result!.vips).to.be.an("array").to.have.length(1);

            expect(result!.vips[0]).to.haveOwnProperty("id").to.be.a("string").to.equal(sharedData.differentUser.id);
            expect(result!.vips[0]).to.haveOwnProperty("login").to.be.a("string").to.equal(sharedData.differentUser.login);
            expect(result!.vips[0]).to.haveOwnProperty("displayName").to.be.a("string").to.equal(sharedData.differentUser.displayName);
        })

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
            const vips = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: [sharedData.differentUser.id]})
            expect(vips).to.not.equal(null);
            expect(vips!.vips).to.be.an("array");
            expect(vips!.vips).to.have.length(1);
            expect(vips!.cursor).to.equal(null);

            expect(vips!.vips[0]).to.haveOwnProperty("id").to.be.a("string").to.equal(sharedData.differentUser.id)
            expect(vips!.vips[0]).to.haveOwnProperty("login").to.be.a("string").to.equal(sharedData.differentUser.login)
            expect(vips!.vips[0]).to.haveOwnProperty("displayName").to.be.a("string").to.equal(sharedData.differentUser.displayName)

        })


        it("Remove Channel VIP", async()=>{
            await apiClient.removeChannelVIP(sharedData.broadcasterId, sharedData.differentUser.id)
            const result = await apiClient.getVIPs(sharedData.broadcasterId, {userIds: [sharedData.differentUser.id]})


            expect(result).to.equal(null)

        })
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

            expect(typeOf(status) == "object").to.equal(true);
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

function makeid(length: any) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}



function typeOf(value: any){
    return value === null ? "null" : typeof value
}