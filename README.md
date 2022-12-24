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

#### ❗IMPORTANT❗: In the current version, TwitchTS automatically updates the UserAccessToken and AppAccessToken used. Therefore, it is necessary to specify the client secret (for AppAccessToken) and refresh token (for UserAccessToken). The necessity will be made optional in the next version: one-time specification of the tokens will be allowed and an interface will be provided to refresh them externally afterwards.

TwitchTS always tries to use the UserAccessToken first for API calls. If this is not defined, the AppAccessToken is used.
So if you know that you don't use any functionality that requires a UserAccessToken, then it is sufficient to specify only the client id and the client secret.

##### AppAccessToken only:
```typescript
const apiClient = new TwitchAPI({
    clientId: "{YOUR-CLIENT-ID}",
    clientSecret: "{YOUR-CLIENT-SECRET}",
});

apiClient.init();
```

##### UserAccessToken with AppAccessToken as a fallback:
```typescript
const apiClient = new TwitchAPI({
    clientId: "{YOUR-CLIENT-ID}",
    clientSecret: "{YOUR-CLIENT-SECRET}",
    refreshToken: "{YOUR-REFRESH_TOKEN}"
});

apiClient.init();
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
- [ ] Make refresh token & user secret optional at initialization
- [ ] Custom exceptions
- [ ] User input validation with ZOD
- [ ] Proper tests
- [ ] Refactoring for a better UX and code readings

## LICENSE
Copyright © 2022 [François Egner](https://github.com/francois-egner).  
This project is [GNU General Public License v3.0](LICENSE) licensed.