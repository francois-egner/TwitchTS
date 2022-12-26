import { expect } from 'chai';
import {TwitchAPI} from "../src";

export const sharedData ={
    broadcasterId: process.env.broadcasterId!,
    moderatorId: process.env.broadcasterId!,
    clientId: process.env.clientId!,
    clientSecret: process.env.clientSecret!,
    userToken: process.env.userToken!,

}


export let apiClient: TwitchAPI;

describe("Shield Mode", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

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