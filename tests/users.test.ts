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

describe("Users", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Get Users",
        async () => {
            const users = await apiClient.getUsers();
            expect(users[0].id).to.be.an("String");
            expect(users[0].id).to.equal(sharedData.broadcasterId);
            console.log(users);
        })

    it("Update User",
        async () => {
            const updatedUser = await apiClient.updateUser();
            expect(updatedUser.id).to.be.an("String");
            expect(updatedUser.id).to.equal(sharedData.broadcasterId);
            console.log(updatedUser);
        })

    it("Get User Block List",
        async (done)=>{
            //const response = await apiClient.getUserBlockList();
            //expect(response.blockedUsers[0].id).to.be.an("String");
            //expect(response.cursor).to.equal(null);
            //console.log(response);
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