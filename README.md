# TwitchTS
Fully typed TwitchAPI wrapper that makes working with TwitchAPI as easy as possible
[![NPM](https://nodei.co/npm/twitch-api-typescript.png?downloads=true&month=3)](https://www.npmjs.com/package/twitch-api-typescript)

## 💻 Installation

```shell
# With npm:
npm install twitch-api-typescript

#With yarn:
#Not added yet
```

## ⚙️ Usage

### Tokenmanagement

TwitchTS always tries to use the user access token first for API calls that can be called using the app access token or user access token. So if you know that you only make calls where the app access token is enough, then it is enough to just specify that.

During initialization, several pieces of optional information can be specified for token management:
1. user access token
   * If this token was specified at initialization, it will be used for all API calls where a user token is required (or for those where a simple app access token is required)
2. app access token
   * If this token was specified at initialization, it will be used for all API calls where an app access token is required.
3. application secret
   * If the client secret is specified during initialization, then TwitchTS will automatically renew the app access token. It is necessary to specify an app access token if a client secret is specified
4. refresh token
   * If the refresh token is specified during initialization, then TwitchTS will automatically renew the user access token (about 1 hour before expiration). It is necessary to specify a user access token when a refresh token is specified



<br/>

#### The following are a few examples of how the individual tokens/secret can be specified

###### User access token & app access token:
```typescript
const apiClient = new TwitchAPI({
    clientId: "{YOUR-CLIENT-ID}",
    tokens:{
        userToken: "{YOUR-USER-ACCESS-TOKEN}",
        appToken: "{YOUR-APP-ACCESS-TOKEN}"
    }
})
await apiClient.init();
```
<br/>

###### Refresh token only:
```typescript
const apiClient = new TwitchAPI({
    clientId: "{YOUR-CLIENT-ID}",
    tokens:{
        refreshToken: "{YOUR-REFRESH-TOKEN}"
    }
})
await apiClient.init();
```

###### Client secret only:
```typescript
const apiClient = new TwitchAPI({
    clientId: "{YOUR-CLIENT-ID}",
    clientSecret: "{YOUR-CLIENT-SECRET}"
})
await apiClient.init();
```
<br/><br/>

At runtime, all settings related to tokens can be changed. TwitchTS offers a public interface for this purpose:

```typescript
const apiClient = new TwitchAPI({
   clientId: "{YOUR-CLIENT-ID}",
   ...
})

//Setting tokens/secret to a new value directly. 
apiClient._tokenHandler.userAccessToken = "{NEW-USER-ACCESS-TOKEN}"
apiClient._tokenHandler.appAccessToken = "{NEW-APP-ACCESS-TOKEN}"
apiClient._tokenHandler.refreshToken = "{NEW-REFRESH-TOKEN}"
apiClient._tokenHandler.clientSecret = "{NEW-CLIENT-SECRET}"

//Manually trigger a refresh of the respective token
await apiClient._tokenHandler.renewAppAccessToken();
await apiClient._tokenHandler.renewUserAccessToken();

//Stop the refresh interval of the respective token refresh routine
await apiClient._tokenHandler.stopAppTokenRefresh();
await apiClient._tokenHandler.stopUserTokenRefresh();

//Start/Restart the refresh interval of the respective token refresh routine
await apiClient._tokenHandler.startAppTokenRefresh();
await apiClient._tokenHandler.stopUserTokenRefresh();
```

### 📝 NOT IMPLEMENTED YET
- Update Drops Entitlements
- Get Extension Configuration Segment
- Set Extension Configuration Segment
- Set Extension Required Configuration
- Update Extension Bits Product
- Get Channel Stream Schedule
- Update Channel Stream Schedule
- Create Channel Stream Schedule Segment
- Update Channel Stream Schedule Segment
- Delete Channel Stream Schedule Segment
- Update User Extensions

### 📝 TODO
- [ ] Implement remaining API calls
- [ ] Finish code documentation
- [x] Make refresh token & user secret optional at initialization
- [x] Custom exceptions
- [ ] User input validation with ZOD
- [ ] Proper tests
- [ ] Refactoring for a better UX and code readings

## LICENSE
Copyright © 2022 [François Egner](https://github.com/francois-egner).  
This project is [GNU General Public License v3.0](LICENSE) licensed.