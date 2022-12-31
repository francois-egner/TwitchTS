import {TwitchAPI} from "../src";
import {Exception, EXCEPTION_REASONS} from "../src/exceptions";
import {expect} from "chai";

export const sharedData ={
    broadcasterId: process.env.broadcasterId!,
    moderatorId: process.env.broadcasterId!,
    clientId: process.env.clientId!,
    clientSecret: process.env.clientSecret!,
    userToken: process.env.userToken!,
    differentUserID: process.env.differntUserId!
}


export let apiClient: TwitchAPI;

describe("Ads", ()=>{
    before(async ()=>{
        apiClient = new TwitchAPI({clientId: sharedData.clientId, clientSecret: sharedData.clientSecret, tokens: {userToken: sharedData.userToken}, options:{refreshAppToken: true}});
        await apiClient.init();
    })

    it("Start Commercial", async()=>{
        try{
            await apiClient.startCommercial(sharedData.broadcasterId, 1000)
        }catch(err: any){
            if(process.env.streamoffline !== "True" && !err.message.includes("live"))
                throw err;

        }

    })
})