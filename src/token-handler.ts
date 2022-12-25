import axios from "axios";
import {z as zod} from "zod";
import {isDefined, isUndefined} from "./utils";

export class TokenHandler{

    private readonly _clientId: string
    private _clientSecret?: string

    private _appAccessToken?: string;

    private _refreshToken?: string;
    private _userAccessToken?: string;

    private _refreshTokenInterval?: NodeJS.Timer;
    private _appAccessTokenInterval?: NodeJS.Timer;

    private readonly _initialUserAccessTokenRefresh: boolean;
    private readonly _initialAppAccessTokenRefresh: boolean;

    /**
     * Tokenhandler that makes token management easy
     * @param clientId The client identifier of the application that should be used for interaction with the Twitch API
     * @param [tokens] Possible tokens at initialization
     * @param [tokens.userAccessToken] An already existing User Access Token
     * @param [tokens.appAccessToken] An already existing App Access Token
     * @param [tokens.refreshToken] A refresh token for auto User Access Token renewal/refresh
     * @param [options] Additional options
     * @param [options.clientSecret] The applications secrets for auto App Access Token renewal/refresh
     * @param [options.refreshAppAccessToken] A Boolean that determines whether the App Access Token should be refreshed automatically
     * @param [options.clientSecret] A Boolean that determines whether the User Access Token should be refreshed automatically
     */
    constructor(clientId: string, tokens?: {userAccessToken?: string, appAccessToken?: string, refreshToken?: string}, options?: {clientSecret?: string, refreshAppAccessToken?: boolean, refreshUserAccessToken?: boolean}){
        this._clientId = zod.string().min(10).parse(clientId)

        if(isUndefined(tokens?.appAccessToken, options?.clientSecret, tokens?.userAccessToken, tokens?.refreshToken)){
            console.error("You did not provide any token or the client secret! You wont be able to make any API calls except those that require a JWT (see Extensions calls)");
        }else{
            if(isUndefined(tokens?.appAccessToken, options?.clientSecret))
                console.info("No App Access Token  or client secret provided. You will not be able to make API calls that only accept App Access Tokens!");

            if(isUndefined(tokens?.userAccessToken, tokens?.refreshToken))
                console.info("No User Access Token or Refresh Token provided. You will not be able to make API calls that only accept User Access Tokens!");
        }



        this._clientSecret = options?.clientSecret;

        this._userAccessToken = tokens?.userAccessToken;
        this._appAccessToken = tokens?.appAccessToken;

        this._initialUserAccessTokenRefresh = isDefined(tokens?.refreshToken) && (isDefined(options?.refreshUserAccessToken) && options!.refreshUserAccessToken!)
        this._initialAppAccessTokenRefresh = isDefined(options?.clientSecret) && (isDefined(options?.refreshAppAccessToken) && options!.refreshAppAccessToken!)
    }

    /**
     * Initializes the handler with the provided information inside the constructor
     */
    public async init(){

        if(this._initialAppAccessTokenRefresh)
            await this.refreshAppAccessToken();

        if(this._initialUserAccessTokenRefresh)
            await this.refreshUserAccessToken();
    }

    //#region API

    /**
     * Stops the User Access Token refresh interval, if it is running
     */
    public stopUserTokenRefresh(){
        if(isDefined(this._refreshTokenInterval))
            clearInterval(this._refreshTokenInterval)
    }

    /**
     * Starts the User Access Token refresh interval or restarts it, if it is already running
     */
    public async startUserTokenRefresh(){
        if(isDefined(this._refreshTokenInterval))
            clearInterval(this._refreshTokenInterval)

        if(isDefined(this._refreshToken)){
            await this.refreshUserAccessToken();
        }else{
            console.error("Failed to start User Access Token refresh interval due to missing refresh token!")
        }

    }

    /**
     * Stops the App Access Token refresh interval, if it is running
     */
    public stopAppTokenRefresh(){
        if(isDefined(this._appAccessTokenInterval))
            clearInterval(this._appAccessTokenInterval)
    }

    /**
     * Starts the App Access Token refresh interval or restarts it, if it is already running
     */
    public async startAppTokenRefresh(){
        if(isDefined(this._appAccessTokenInterval))
            clearInterval(this._appAccessTokenInterval)

        if(isDefined(this._clientSecret)){
            await this.refreshAppAccessToken();
        }else{
            console.error("Failed to start App Access Token refresh interval due to missing client secret!")
        }
    }

    /**
     * Renews/refreshes the User Access Token once (with the initial/current internal client secret)
     */
    public async renewAppAccessToken(){
        await this.refreshAppAccessToken(true);
    }

    /**
     * Renews/refreshes the User Access Token once (with the initial/current internal token information)
     */
    public async renewUserAccessToken(){
        await this.refreshUserAccessToken(true);
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
        return <string>this._clientSecret;
    }

    get refreshToken(): string | undefined{
        return this._refreshToken;
    }

    set appAccessToken(token: string | undefined){
        this._appAccessToken = token;
    }

    set userToken(token: string){
        this._userAccessToken = token;
    }

    set refreshToken(token: string | undefined){

        if(!isUndefined(token)){
            this.stopUserTokenRefresh()
            this._refreshToken = undefined;
            return;
        }

        //If refresh interval was already running, restart interval
        const tokenWasSet = isDefined(this._refreshToken);
        
        this._refreshToken = token;
        
        if(tokenWasSet){
            this.refreshUserAccessToken();    
        }
    }

    set clientSecret(secret: string | undefined){

        if(!isUndefined(secret)){
            this.stopAppTokenRefresh()
            this._clientSecret = undefined;
            return;
        }

        //If refresh interval was already running, restart interval
        const secretWasSet = isDefined(this._clientSecret);

        this._clientSecret = secret;

        if(secretWasSet){
            this.refreshAppAccessToken();
        }
    }

    //endregion

    /**
     * Refreshes the App Access Token once or starts the refresh interval after the first renewal/refresh
     * @param refreshOnce A boolean that determines whether the App Access token should only be renewed/refreshed once
     * @private
     */
    private async refreshAppAccessToken(refreshOnce?: boolean){
        try{
            if(isUndefined(this._clientSecret)){
                console.error("Unable to start App Access token refresh interval due to missing client secret!")
                return;
            }

            const response = await axios.post("https://id.twitch.tv/oauth2/token",{
                client_id: this._clientId,
                client_secret: this._clientSecret,
                grant_type: "client_credentials"
            })

            this._appAccessToken = response.data.access_token;

            if(isDefined(refreshOnce))
                return;

            if(this._appAccessTokenInterval)
                clearInterval(this._appAccessTokenInterval);

            this._appAccessTokenInterval = setInterval(this.refreshAppAccessToken.bind(this), 1000 * 60 * 60 * 24 * 10);
        }catch(err: unknown){
            console.error(err);
        }
    }

    /**
     * Refreshes the User Access Token once or starts the refresh interval after the first renewal/refresh
     * @param refreshOnce A boolean that determines whether the User Access token should only be renewed/refreshed once
     * @private
     */
    private async refreshUserAccessToken(refreshOnce?: boolean){
        try{
            if(isUndefined(this._refreshToken)){
                console.error("Unable to start User Access token refresh interval due to missing refresh token!")
                return;
            }

            const response = await axios.post("https://id.twitch.tv/oauth2/token",{
                client_id: this._clientId,
                client_secret: this._clientSecret,
                grant_type: "refresh_token",
                refresh_token: this._refreshToken
            })

            this._userAccessToken = response.data.access_token;

            if(isDefined(refreshOnce))
                return;

            const expiresIn = response.data.expires_in * 1000;


            if(this._refreshTokenInterval)
                clearInterval(this._refreshTokenInterval);
            
            this._refreshTokenInterval = setInterval(this.refreshUserAccessToken.bind(this), expiresIn - (1000 * 60 * 60)); //1 hour prior to expiration
        }catch(err: unknown){
            console.error(err);
        }
    }

}



