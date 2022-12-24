import axios from "axios";
import {z as zod} from "zod";
import {writeFileSync} from "fs";
import { isUndefined } from "./utils";

export class TokenHandler{

    private readonly _clientId: string
    private readonly _clientSecret: string

    private _appAccessToken?: string;

    private _refreshToken?: string;
    private _userAccessToken?: string;

    private _refreshTokenInterval?: NodeJS.Timer;
    private _appAccessTokenInterval?: NodeJS.Timer;

    private readonly _writeOut?: {path: string, userToken?: boolean, appToken?: boolean, refreshToken?: boolean};

    constructor(config: {clientId: string, clientSecret: string, refreshToken?: string, writeOut?: {path: string, userToken?: boolean, appToken?: boolean, refreshToken?: boolean}}){
        config = constructorValidator.parse(config)

        this._clientId = config.clientId
        this._clientSecret = config.clientSecret
        this._refreshToken = config.refreshToken

        if(!isUndefined(config.writeOut))
            this._writeOut = config.writeOut
        
    }


    public async init(){
        await this.refreshAppAccessToken();
        await this.refreshUserAccessToken();
    }
    // #region API
    public stopUserTokenRefresh(){
        clearInterval(this._refreshTokenInterval);
    }

    public async startUserTokenRefresh(){
        if(!isUndefined(this._refreshTokenInterval))
            clearInterval(this._refreshTokenInterval)
        
        await this.refreshUserAccessToken();
    }

    public stopAppTokenRefresh(){
        clearInterval(this._appAccessTokenInterval);
    }

    public async startAppTokenRefresh(){
        if(!isUndefined(this._appAccessTokenInterval))
            clearInterval(this._appAccessTokenInterval)
        
        await this.refreshAppAccessToken();
    }

    get appAccessToken(): string | undefined{
        return this._appAccessToken;
    }

    get userAccessToken(): string | undefined{
        return this._userAccessToken;
    }

    get clientId(): string{
        return this._clientId;
    }

    get clientSecret(): string{
        return this._clientSecret;
    }

    get refreshToken(): string | undefined{
        return this._refreshToken;
    }

    set userToken(token: string){
        this._userAccessToken = token;
    }

    set refreshToken(token: string | undefined){

        if(!isUndefined(token)){
            if(!isUndefined(this._refreshTokenInterval))
                clearInterval(this._refreshTokenInterval)
            this._refreshToken = undefined;
            return;
        }

        
        const tokenWasSet = isUndefined(this._refreshToken);
        
        this._refreshToken = token;
        
        if(!tokenWasSet){
            this.refreshUserAccessToken();    
        }
    }
    // #endregion


    private async refreshAppAccessToken(){
        try{
            const response = await axios.post("https://id.twitch.tv/oauth2/token",{
                client_id: this._clientId,
                client_secret: this._clientSecret,
                grant_type: "client_credentials"
            })

            this._appAccessToken = response.data.access_token;
            console.log(`New app access token: ${this.appAccessToken}`)

            this.writeOutFile();


            if(this._appAccessTokenInterval)
                clearInterval(this._appAccessTokenInterval);

            this._appAccessTokenInterval = setInterval(this.refreshAppAccessToken.bind(this), 1000 * 60 * 60 * 24 * 10);
        }catch(err: unknown){
            console.error(err);
        }
    }

    private async refreshUserAccessToken(){
        try{
            if(isUndefined(this._refreshToken)){
                return;
            }

            const response = await axios.post("https://id.twitch.tv/oauth2/token",{
                client_id: this._clientId,
                client_secret: this._clientSecret,
                grant_type: "refresh_token",
                refresh_token: this._refreshToken
            })

            this._userAccessToken = response.data.access_token;

            this.writeOutFile();

            const expiresIn = response.data.expires_in * 1000;

            if(this._refreshTokenInterval)
                clearInterval(this._refreshTokenInterval);
            
            this._refreshTokenInterval = setInterval(this.refreshUserAccessToken.bind(this), expiresIn - (1000 * 60 * 60)); //1 hour prior to expiration
        }catch(err: unknown){
            console.error(err);
        }
    }

    private writeOutFile(){
        if(this._writeOut != null){
            const writeOutTokens: {appAccessToken?: string, userAccessToken?: string, refreshToken?: string} = {}
            if(this._writeOut.appToken === true)
                writeOutTokens.appAccessToken = this._appAccessToken;

            if(this._writeOut.userToken === true)
                writeOutTokens.userAccessToken = this._appAccessToken; 

            if(this._writeOut.refreshToken === true)
                writeOutTokens.refreshToken = this._appAccessToken; 
            
                writeFileSync(this._writeOut.path, JSON.stringify(writeOutTokens, null, 4));
        }
    }
}

const constructorValidator = zod.object({
    //Length of 20 is the lowest ive found
    clientId: zod.string().min(20),
    clientSecret: zod.string().min(20),
    refreshToken: zod.string().min(20).optional(),
    writeOut: zod.object({
        path: zod.string().min(2),
        userToken: zod.boolean().optional(),
        appToken: zod.boolean().optional(),
        refreshToken: zod.boolean().optional()
    }).optional()
})



