import { TokenHandler } from "./token-handler";
import axios from "axios";
import {isDefined, isUndefined} from "./utils";
import {Exception} from "./exceptions";

export class TwitchAPI {

    public _tokenHandler: TokenHandler;


    constructor(config: { clientId: string, clientSecret?: string, tokens?:{ refreshToken?: string, userToken?: string, appToken?: string }, options?: {refreshUserToken?: boolean, refreshAppToken?: boolean}}) {
        this._tokenHandler = new TokenHandler(config.clientId, {userAccessToken: config.tokens?.userToken, refreshToken: config.tokens?.refreshToken, appAccessToken: config.tokens?.appToken}, {clientSecret: config.clientSecret, refreshAppAccessToken: config.options?.refreshAppToken, refreshUserAccessToken: config.options?.refreshUserToken})
    }

    public async init() {
        await this._tokenHandler.init()
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#start-commercial
    /**
     * Starts a commercial on the specified channel.
     * @tokentype user
     * @scope channel:edit:commercial
     * @note NOTE: Only the broadcaster may start a commercial; the broadcaster’s editors and moderators may not start commercials on behalf of the broadcaster.
     * @param broadcasterId The ID of the partner or affiliate broadcaster that wants to run the commercial
     * @param length The length of the commercial to run, in seconds. Twitch tries to serve a commercial that’s the requested length, but it may be shorter or longer. The maximum length you should request is 180 seconds.
     * @returns An array that contains a single object with the status of your start commercial request.
     */
    public async startCommercial(broadcasterId: string, length: number): Promise<startCommercialResult> {
        const response = await axios.post("https://api.twitch.tv/helix/channels/commercial", {
            "broadcaster_id": broadcasterId,
            "length": length
        }, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId,
                "Content-Type": "application/json"
            }
        })

        return {
            commercialLength: response.data.data.length,
            twitchMessage: response.data.data.message,
            nextCommercialIn: response.data.data.retry_after
        } as startCommercialResult;

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-extension-analytics
    /**
     * Gets an analytics report for one or more extensions. The response contains the URLs used to download the reports (CSV files)
     * @tokentype user
     * @scope analytics:read:extensions
     * @param extensionId The extension’s client ID. If specified, the response contains a report for the specified extension. If not specified, the response includes a report for each extension that the authenticated user owns.
     * @param startedAt The reporting window’s start date. The start date must be on or after January 31, 2018
     * @param endedAt The reporting window’s end date, in RFC3339 format. Enter this date only if you have also entered a start date
     * @param count The maximum number of extensions, reports will be generated for
     * @returns A list of reports. The reports are returned in no particular order
     */
    public async getExtensionAnalytics(extensionId?: string, startedAt?: Date, endedAt?: Date, count?: number): Promise<ExtensionReport[]> {
        const reports: ExtensionReport[] = []

        let cursor = undefined;
        let URL = "https://api.twitch.tv/helix/analytics/extensions?"

        if (!isUndefined(extensionId))
            URL = `${URL}extension_id=${extensionId}&`

        if (!isUndefined(startedAt))
            URL = `${URL}started_at=${startedAt!.toISOString()}&`

        if (!isUndefined(startedAt) && !isUndefined(endedAt))
            URL = `${URL}ended_at=${endedAt!.toISOString()}&`


        URL = `${URL}first=${(count! > 100) ? 100 : count}&`

        while (true) {
            if (!isUndefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            for (const report of response.data.data) {
                reports.push({
                    extensionId: report.extension_id,
                    url: report.url,
                    type: report.type,
                    range: {
                        startedAt: new Date(report.date_range.started_at),
                        endedAt: new Date(report.date_range.ended_at)
                    }
                })

            }

            if (Object.keys(response.data.pagination).length === 0)
                break;

            cursor = response.data.pagination.cursor;

        }

        if (!isUndefined(extensionId))
            return reports;

        return reports.slice(0, count);
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-game-analytics
    /**
     * Gets an analytics report for one or more games. The response contains the URLs used to download the reports (CSV files).
     * @tokentype user
     * @scope analytics:read:games
     * @param gameId The game’s client ID. If specified, the response contains a report for the specified game. If not specified, the response includes a report for each of the authenticated user’s games.
     * @param startedAt The reporting window’s start date. The start date must be on or after January 31, 2018
     * @param endedAt The reporting window’s end date, in RFC3339 format. Enter this date only if you have also entered a start date
     * @param count The maximum number of games, reports will be generated for
     * @returns A list of reports. The reports are returned in no particular order
     */
    public async getGameAnalytics(gameId?: string, startedAt?: Date, endedAt?: Date, count?: number) {
        const reports: GameReport[] = []

        let cursor = undefined;
        let URL = "https://api.twitch.tv/helix/analytics/games?"

        if (!isUndefined(gameId))
            URL = `${URL}extension_id=${gameId}&`

        if (!isUndefined(startedAt))
            URL = `${URL}started_at=${startedAt!.toISOString()}&`

        if (!isUndefined(startedAt) && !isUndefined(endedAt))
            URL = `${URL}ended_at=${endedAt!.toISOString()}&`


        URL = `${URL}first=${(count! > 100) ? 100 : count}&`

        while (true) {
            if (!isUndefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            for (const report of response.data.data) {
                reports.push({
                    gameId: report.game_id,
                    url: report.url,
                    type: report.type,
                    range: {
                        startedAt: new Date(report.date_range.started_at),
                        endedAt: new Date(report.date_range.ended_at)
                    }
                })

            }

            if (Object.keys(response.data.pagination).length === 0)
                break;

            cursor = response.data.pagination.cursor;

        }

        if (!isUndefined(gameId))
            return reports;

        return reports.slice(0, count);
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-bits-leaderboard
    /**
     * Gets the Bits leaderboard for the authenticated broadcaster.
     * @tokentype user
     * @scope bits:read
     * @param count The number of results to return. The minimum count is 1 and the maximum is 100
     * @param period The time period over which data is aggregated (uses the PST time zone).
     * @param startedAt The start date, in RFC3339 format, used for determining the aggregation period.
     * @param userId An ID that identifies a user that cheered bits in the channel. If count is greater than 1, the response may include users ranked above and below the specified user. To get the leaderboard’s top leaders, don’t specify a user ID.
     * @returns A list of leaderboard leaders. The leaders are returned in rank order by how much they’ve cheered. The array is empty if nobody has cheered bits.
     */
    public async getBitsLeaderboards(count?: number, period?: "day" | "week" | "month" | "year" | "all", startedAt?: Date, userId?: string): Promise<LeaderboardLeaders[]> {

        const leaders: LeaderboardLeaders[] = [];

        let URL = "https://api.twitch.tv/helix/bits/leaderboard?"

        if (!isUndefined(count))
            URL = `${URL}count=${count}&`

        if (!isUndefined(period))
            URL = `${URL}period=${period}&`

        if (!isUndefined(startedAt))
            URL = `${URL}ended_at=${startedAt!.toISOString()}&`

        const response = await axios.get(URL.slice(0, -1), {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const leader of response.data.data) {
            leaders.push({
                userId: leader.user_id,
                userLogin: leader.user_login,
                displayName: leader.user_name,
                rank: leader.rank,
                score: leader.score,
                date_range: {
                    started_at: new Date(leader.date_range.started_at),
                    ended_at: new Date(leader.date_range.ended_at)
                }
            })
        }

        return leaders;


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-cheermotes
    /**
     * Gets a list of Cheermotes that users can use to cheer Bits in any Bits-enabled channel’s chat room.
     * @tokentype app, user
     * @param broadcasterId The ID of the broadcaster whose custom Cheermotes you want to get. Specify the broadcaster’s ID if you want to include the broadcaster’s Cheermotes in the response (not all broadcasters upload Cheermotes). If not specified, the response contains only global Cheermotes.
     * @returns The list of Cheermotes. The list is in ascending order by the order field’s value.
     */
    public async getCheermotes(broadcasterId?: string): Promise<Cheermote[]> {

        const cheermotes: Cheermote[] = [];

        const URL = `https://api.twitch.tv/helix/bits/cheermotes${!isUndefined(broadcasterId) ? `?${broadcasterId}` : ""}`
        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const cheermote of response.data.data) {
            cheermotes.push({
                prefix: cheermote.prefix,
                tiers: cheermote.tiers.map((tier: any) => {
                    return {
                        minBits: tier.min_bits,
                        level: tier.id,
                        color: tier.color,
                        images: tier.images,
                        canCheer: tier.can_cheer,
                        showInBitsCard: tier.show_in_bits_card
                    }
                }),
                type: cheermote.type,
                order: cheermote.order,
                lastUpdated: new Date(cheermote.last_updated),
                isCharitable: cheermote.is_charitable
            })
        }

        return cheermotes;
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-extension-transactions
    /**
     * Gets an extension’s list of transactions.
     * @Tokentype app
     * @param extensionId The ID of the extension whose list of transactions you want to get.
     * @param [options] Additional optional parameters
     * @param [options.transactionIds] Transaction IDs used to filter the list of transactions.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of transactions to be returned.
     * @return The list of transactions. If no one was found, null will be returned.
     */
    public async getExtensionTransactions(extensionId: string, options?: {transactionIds: string[], cursor?: string, max?: number}):Promise<{transactions: ExtensionTransaction[], cursor: string | null } | null>{
        const transactions: ExtensionTransaction[] = [];

        let URL = `https://api.twitch.tv/helix/extensions/transactions?extension_id=${extensionId}`

        if(isDefined(options?.transactionIds)){
            URL = URL + `&id=${options!.transactionIds!.join("&id=")}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const transaction of response.data.data){
                transactions.push({
                    id: transaction.id,
                    timestamp: new Date(transaction.timestamp),
                    broadcasterId: transaction.broadcaster_id,
                    broadcasterLogin: transaction.broadcaster_login,
                    broadcasterDisplayName: transaction.broadcaster_name,
                    buyerId: transaction.user_id,
                    buyerLogin: transaction.user_login,
                    buyerDisplayName: transaction.user_name,
                    productType: transaction.product_type,
                    productData:{
                        sku: transaction.product_data.sku,
                        domain: transaction.product_data.domain,
                        cost:{
                            amount: transaction.product_data.cost.amount,
                            type: transaction.product_data.cost.type
                        },
                        inDevelopment: transaction.inDevelopment,
                        name: transaction.displayName,
                        expiration: transaction.expiration,
                        broadcast: transaction.broadcast
                    }
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {transactions: transactions, cursor: cursor!};
                    return transactions.length === 0 ? null : {transactions: transactions, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return transactions.length === 0 ? null : {transactions: transactions, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-information
    /**
     * Gets information about one or more channels.
     * @tokentype app, user
     * @param broadcasterIds The ID of the broadcasters whose channel you want to get
     * returns A list that contains information about the specified channels. The list is empty if the specified channels weren’t found.
     */
    public async getChannelInformation(broadcasterIds: string[]): Promise<ChannelInformation[]> {
        const channels: ChannelInformation[] = [];

        const URL = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterIds.join("&broadcaster_id=")}`
        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const channel of response.data.data) {
            channels.push({
                streamerId: channel.broadcaster_id,
                streamerLogin: channel.broadcaster_login,
                streamerDisplayName: channel.broadcaster_name,
                streamerLanguage: channel.broadcaster_language,
                gameName: channel.game_name,
                gameId: channel.game_id,
                streamTitle: channel.title,
                streamDelay: channel.delay
            })
        }

        return channels;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#modify-channel-information
    /**
     * Updates a channel’s properties.
     * @Tokentype user
     * @Scope channel:manage:broadcast
     * @NOTE The broadcasterId must match the user ID associated with the user access token.
     * @param broadcasterId The ID of the broadcaster whose channel you want to update. This ID must match the user ID associated with the user access token.
     * @param modifications Available channel property modifications
     * @param modifications.gameId The ID of the game that the user plays. The game is not updated if the ID isn’t a game ID that Twitch recognizes. To unset this field, use “0” or “” (an empty string).
     * @param modifications.language The user’s preferred language.
     * @param modifications.title The title of the user’s stream. You may not set this field to an empty string.
     * @param modifications.delay The number of seconds you want your broadcast buffered before streaming it live. Only users with Partner status may set this field. The maximum delay is 900 seconds (15 minutes).
     */
    public async modifyChannelInformation(broadcasterId: string, modifications: { gameId?: string, language?: Languages, title?: string, delay?: number }) {
        const URL = `https://api.twitch.tv/helix/channels?broadcaster_id=${broadcasterId}`

        const modifyObject = {}

        if (!isUndefined(modifications.gameId))
            Object.defineProperty(modifyObject, "game_id", {value: modifications.gameId, enumerable: true})

        if (!isUndefined(modifications.language))
            Object.defineProperty(modifyObject, "broadcaster_language", {
                value: modifications.language,
                enumerable: true
            })

        if (!isUndefined(modifications.title))
            Object.defineProperty(modifyObject, "title", {value: modifications.title, enumerable: true})

        if (!isUndefined(modifications.delay))
            Object.defineProperty(modifyObject, "delay", {value: modifications.delay, enumerable: true})


        await axios.patch(URL, modifyObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-editors
    /**
     * Gets the broadcaster’s channel editors.
     * @Tokentype user
     * @Scope channel:read:editors
     * @NOTE The broadcasterId must match the user ID associated with the user access token.
     * @param broadcasterId The ID of the broadcaster that owns the channel. This ID must match the user ID in the access token.
     */
    public async getChannelEditors(broadcasterId: string) {
        const editors: Editor[] = [];

        const URL = `https://api.twitch.tv/helix/channels/editors?broadcaster_id=${broadcasterId}`

        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const editor of response.data.data) {
            editors.push({
                id: editor.user_id,
                displayName: editor.user_name,
                appointedAt: new Date(editor.created_at)
            })
        }

        return editors;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#create-custom-rewards
    /**
     * Creates a Custom Reward in the broadcaster’s channel.
     * @Tokentype user
     * @Scope channel:manage:redemptions
     * @NOTE The broadcasterId must match the user ID found in the OAuth token.
     * @NOTE The maximum number of custom rewards per channel is 50, which includes both enabled and disabled rewards.
     * @param broadcasterId The ID of the broadcaster to add the custom reward to.
     * @param rewardData Data for new custom reward
     * @param rewardData.title The custom reward’s title. The title may contain a maximum of 45 characters and it must be unique amongst all of the broadcaster’s custom rewards.
     * @param rewardData.cost The cost of the reward, in Channel Points. The minimum is 1 point.
     * @param rewardData.prompt The prompt shown to the viewer when they redeem the reward. Specify a prompt if is_user_input_required is true. The prompt is limited to a maximum of 200 characters.
     * @param rewardData.isEnabled    A Boolean value that determines whether the reward is enabled. Default: true
     * @param rewardData.backgroundColor The background color (in Hex format) to use for the reward.
     * @param rewardData.userInputRequired A Boolean value that determines whether the user needs to enter information when redeeming the reward. Default: false
     * @param rewardData.maxPerStreamEnabled A Boolean value that determines whether to limit the maximum number of redemptions allowed per live stream. Default: false
     * @param rewardData.maxPerStream The maximum number of redemptions allowed per live stream. Minimum is 1
     * @param rewardData.maxPerUserPerStreamEnabled A Boolean value that determines whether to limit the maximum number of redemptions allowed per user per stream. Default: false
     * @param rewardData.maxPerUserPerStream The maximum number of redemptions allowed per user per stream.
     * @param rewardData.globalCooldownEnabled A Boolean value that determines whether to apply a cooldown period between redemptions. Default: false
     * @param rewardData.globalCooldown The cooldown period, in seconds.
     * @param rewardData.redemptionsSkipRequestQueue A Boolean value that determines whether redemptions should be set to FULFILLED status immediately when a reward is redeemed. Default: false
     */
    public async createCustomReward(broadcasterId: string, rewardData: { title: string, cost: number, prompt?: string, isEnabled?: boolean, backgroundColor?: string, userInputRequired?: boolean, maxPerStreamEnabled?: boolean, maxPerStream?: number, maxPerUserPerStreamEnabled?: boolean, maxPerUserPerStream?: number, globalCooldownEnabled?: boolean, globalCooldown?: number, redemptionsSkipRequestQueue?: boolean }): Promise<Reward> {
        rewardData.isEnabled = rewardData.isEnabled ?? true
        rewardData.userInputRequired = rewardData.userInputRequired ?? false
        rewardData.maxPerStreamEnabled = rewardData.maxPerStreamEnabled ?? false
        rewardData.maxPerUserPerStreamEnabled = rewardData.maxPerUserPerStreamEnabled ?? false
        rewardData.globalCooldownEnabled = rewardData.globalCooldownEnabled ?? false
        rewardData.redemptionsSkipRequestQueue = rewardData.redemptionsSkipRequestQueue ?? false

        const creationObject = {
            title: rewardData.title,
            cost: rewardData.cost
        };

        if (!isUndefined(rewardData.prompt))
            Object.defineProperty(creationObject, "prompt", {value: rewardData.prompt, enumerable: true})

        if (!isUndefined(rewardData.isEnabled))
            Object.defineProperty(creationObject, "is_enabled", {value: rewardData.isEnabled, enumerable: true})

        if (!isUndefined(rewardData.backgroundColor))
            Object.defineProperty(creationObject, "background_color", {value: rewardData.isEnabled, enumerable: true})

        if (!isUndefined(rewardData.userInputRequired))
            Object.defineProperty(creationObject, "is_user_input_required", {
                value: rewardData.userInputRequired,
                enumerable: true
            })


        if (rewardData.maxPerStreamEnabled && !isUndefined(rewardData.maxPerStream))
            Object.defineProperty(creationObject, "is_max_per_stream_enabled", {
                value: rewardData.maxPerStreamEnabled,
                enumerable: true
            })

        if (!isUndefined(rewardData.maxPerStream) && rewardData.maxPerStreamEnabled)
            Object.defineProperty(creationObject, "is_max_per_stream_enabled", {
                value: rewardData.maxPerStreamEnabled,
                enumerable: true
            })


        if (rewardData.maxPerUserPerStreamEnabled && !isUndefined(rewardData.maxPerUserPerStream))
            Object.defineProperty(creationObject, "is_max_per_user_per_stream_enabled", {
                value: rewardData.maxPerUserPerStreamEnabled,
                enumerable: true
            })

        if (!isUndefined(rewardData.maxPerUserPerStream) && rewardData.maxPerUserPerStreamEnabled)
            Object.defineProperty(creationObject, "max_per_user_per_stream", {
                value: rewardData.maxPerUserPerStream,
                enumerable: true
            })


        if (rewardData.globalCooldownEnabled && !isUndefined(rewardData.globalCooldown))
            Object.defineProperty(creationObject, "is_global_cooldown_enabled", {
                value: rewardData.globalCooldownEnabled,
                enumerable: true
            })

        if (!isUndefined(rewardData.globalCooldown) && rewardData.globalCooldownEnabled)
            Object.defineProperty(creationObject, "global_cooldown_seconds", {
                value: rewardData.globalCooldown,
                enumerable: true
            })

        if (!isUndefined(rewardData.redemptionsSkipRequestQueue))
            Object.defineProperty(creationObject, "should_redemptions_skip_request_queue", {
                value: rewardData.redemptionsSkipRequestQueue,
                enumerable: true
            })


        const response = await axios.post(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`, creationObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId,
                "Content-Type": "application/json"
            }
        })

        const reward = response.data.data[0]

        return {
            broadcasterId: reward.broadcaster_id,
            broadcasterLogin: reward.broadcaster_login,
            broadcasterDisplayName: reward.broadcaster_name,
            id: reward.id,
            title: reward.title,
            prompt: reward.prompt,
            cost: reward.cost,
            image: {
                url_1x: reward.image.url_1x,
                url_2x: reward.image.url_2x,
                url_4x: reward.image.url_4x
            },
            defaultImage: {
                url_1x: reward.default_image.url_1x,
                url_2x: reward.default_image.url_2x,
                url_4x: reward.default_image.url_4x
            },
            backgroundColor: reward.background_color,
            isEnabled: reward.is_enabled,
            userInputRequired: reward.is_user_input_required,
            maxPerStreamSetting: {
                isEnabled: reward.max_per_stream_settings.is_enabled,
                maxPerStream: reward.max_per_stream_settings.max_per_stream
            },
            maxPerUserPerStreamSetting: {
                isEnabled: reward.max_per_user_per_stream_setting.is_enabled,
                maxPerUserPerStream: reward.max_per_user_per_stream_setting.max_per_user_per_stream
            },
            globalCooldownSetting: {
                isEnabled: reward.global_cooldown_setting.is_enabled,
                globalCooldown: reward.global_cooldown_setting.global_cooldown_seconds
            },
            isPaused: reward.is_paused,
            isInStock: reward.is_in_stock,
            redemptionsSkipRequestQueue: reward.should_redemptions_skip_request_queue,
            redemptionsCountCurrentStream: reward.redemptions_redeemed_current_stream,
            cooldownExpiresAt: new Date(reward.cooldown_expires_at)
        }

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#delete-custom-reward
    /**
     * Deletes a custom reward that the broadcaster created.
     * @param broadcasterId The ID of the broadcaster that created the custom reward.
     * @param rewardId The ID of the custom reward to delete.
     */
    public async deleteCustomReward(broadcasterId: string, rewardId: string): Promise<void> {
        await axios.delete(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId,
                "Content-Type": "application/json"
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-custom-reward
    /**
     * Gets a list of custom rewards that the specified broadcaster created.
     * @Tokentype user
     * @Scope channel:read:redemptions
     * @param broadcasterId The ID of the broadcaster whose custom rewards you want to get.
     * @param ids A list/array of IDs to filter the rewards by.
     * @returns A list of custom rewards. The list is in ascending order by rewardId.
     */
    public async getCustomRewards(broadcasterId: string, options: { rewardIds?: string[], manageableRewardsOnly?: boolean }): Promise<Reward[]> {
        const rewards: Reward[] = [];

        let URL = `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&`;
        if (!isUndefined(options.rewardIds))
            URL = `${URL}${options.rewardIds!.join("&id=")}`

        if (!isUndefined(options.manageableRewardsOnly))
            URL = URL.endsWith("&") ? `${URL}only_manageable_rewards=${options.manageableRewardsOnly}` : `${URL}&only_manageable_rewards=${options.manageableRewardsOnly}`

        if (URL.endsWith("&"))
            URL = URL.slice(0, -1)


        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const reward of response.data.data) {
            rewards.push({
                broadcasterId: reward.broadcaster_id,
                broadcasterLogin: reward.broadcaster_login,
                broadcasterDisplayName: reward.broadcaster_name,
                id: reward.id,
                title: reward.title,
                prompt: reward.prompt,
                cost: reward.cost,
                image: {
                    url_1x: reward.image.url_1x,
                    url_2x: reward.image.url_2x,
                    url_4x: reward.image.url_4x
                },
                defaultImage: {
                    url_1x: reward.default_image.url_1x,
                    url_2x: reward.default_image.url_2x,
                    url_4x: reward.default_image.url_4x
                },
                backgroundColor: reward.background_color,
                isEnabled: reward.is_enabled,
                userInputRequired: reward.is_user_input_required,
                maxPerStreamSetting: {
                    isEnabled: reward.max_per_stream_settings.is_enabled,
                    maxPerStream: reward.max_per_stream_settings.max_per_stream
                },
                maxPerUserPerStreamSetting: {
                    isEnabled: reward.max_per_user_per_stream_setting.is_enabled,
                    maxPerUserPerStream: reward.max_per_user_per_stream_setting.max_per_user_per_stream
                },
                globalCooldownSetting: {
                    isEnabled: reward.global_cooldown_setting.is_enabled,
                    globalCooldown: reward.global_cooldown_setting.global_cooldown_seconds
                },
                isPaused: reward.is_paused,
                isInStock: reward.is_in_stock,
                redemptionsSkipRequestQueue: reward.should_redemptions_skip_request_queue,
                redemptionsCountCurrentStream: reward.redemptions_redeemed_current_stream,
                cooldownExpiresAt: new Date(reward.cooldown_expires_at)
            })
        }

        return rewards;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-custom-reward-redemption
    /**
     * Gets a list of redemptions for the specified custom reward.
     * @Tokentype user
     * @Scope channel:read:redemptions
     * @NOTE The app used to create the reward is the only app that may get the redemptions.
     * @NOTE The broadcasterId must match the user ID found in the user OAuth token.
     * @param broadcasterId The ID of the broadcaster that owns the custom reward.
     * @param rewardId The ID that identifies the custom reward whose redemptions you want to get.
     * @param options Optional request parameters
     * @returns The list of redemptions for the specified reward. The list is empty if there are no redemptions that match the redemption criteria.
     */
    public async getCustomRewardRedemptions(broadcasterId: string, rewardId: string, options: { status?: "CANCELED" | "FULFILLED" | "UNFULFILLED", id?: string, sort?: "OLDEST" | "NEWEST", max?: number }): Promise<Redemption[]> {
        const redemptions: Redemption[] = [];

        const pageSize = (isUndefined(options.max) || options.max! > 100) ? 100 : options.max
        let cursor = undefined;

        let URL = `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&reward_id=${rewardId}&first=${pageSize}`

        if (isUndefined(options.id)) {
            if (!isUndefined(options.status)) {
                URL = `${URL}&status${options.status}`
            } else {
                throw new Error("Status must be provided if no ID was provided!")
            }
        }

        if (!isUndefined(options.id))
            URL = `${URL}&id${options.status}`

        if (!isUndefined(options.sort))
            URL = `${URL}&sort${options.sort}`

        while (true) {
            const finalURL: string = `${URL}${!isUndefined(cursor) ? `after=${cursor}` : ""}`
            const response = await axios.get(finalURL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            for (const redemption of response.data.data) {
                redemptions.push({
                    broadcasterId: redemption.broadcaster_id,
                    broadcasterLogin: redemption.broadcaster_login,
                    broadcasterDisplayName: redemption.broadcaster_name,
                    id: redemption.id,
                    redeemerId: redemption.user_id,
                    redeemerLogin: redemption.user_login,
                    redeemerInput: redemption.user_input,
                    redeemerDisplayName: redemption.user_name,
                    status: redemption.status,
                    redeemedAt: new Date(redemption.redeemed_at),
                    reward: {
                        id: redemption.reward.id,
                        title: redemption.reward.title,
                        prompt: redemption.reward.prompt,
                        cost: redemption.reward.cost
                    }
                })
            }

            if (Object.keys(response.data.pagination).length === 0)
                break;

            cursor = response.data.pagination.cursor;
        }

        return redemptions;

    }

    //Reference: https://dev.twitch.tv/docs/api/reference#update-custom-reward
    /**
     * Updates a custom reward. The app used to create the reward is the only app that may update the reward.
     * @Tokentype user
     * @Scope channel:manage:redemptions
     * @param broadcasterId The ID of the broadcaster that’s updating the reward.
     * @param rewardId The ID of the reward to update.
     * @param modifications
     * @return The updated reward.
     */
    public async updateCustomReward(broadcasterId: string, rewardId: string, modifications: RewardModifications):Promise<Reward>{
        const requestObject = {}

        if(isDefined(modifications.title))
            Object.defineProperty(requestObject, "title", {value: modifications.title, enumerable: true})

        if(isDefined(modifications.prompt))
            Object.defineProperty(requestObject, "prompt", {value: modifications.prompt, enumerable: true})

        if(isDefined(modifications.cost))
            Object.defineProperty(requestObject, "cost", {value: modifications.cost, enumerable: true})

        if(isDefined(modifications.backgroundColor))
            Object.defineProperty(requestObject, "background_color", {value: modifications.backgroundColor, enumerable: true})

        if(isDefined(modifications.isEnabled))
            Object.defineProperty(requestObject, "is_enabled", {value: modifications.isEnabled, enumerable: true})

        if(isDefined(modifications.isUserInputRequired))
            Object.defineProperty(requestObject, "is_user_input_required", {value: modifications.isUserInputRequired, enumerable: true})

        if(isDefined(modifications.isMaxPerStreamEnabled))
            Object.defineProperty(requestObject, "is_max_per_stream_enabled", {value: modifications.isMaxPerStreamEnabled, enumerable: true})


        if(isDefined(modifications.maxPerStream))
            Object.defineProperty(requestObject, "max_per_stream", {value: modifications.maxPerStream, enumerable: true})

        if(isDefined(modifications.isMaxPerUserPerStreamEnabled))
            Object.defineProperty(requestObject, "is_max_per_user_per_stream_enabled", {value: modifications.isMaxPerUserPerStreamEnabled, enumerable: true})

        if(isDefined(modifications.maxPerUserPerStream))
            Object.defineProperty(requestObject, "max_per_user_per_stream", {value: modifications.maxPerUserPerStream, enumerable: true})

        if(isDefined(modifications.isCooldownEnabled))
            Object.defineProperty(requestObject, "is_global_cooldown_enabled", {value: modifications.isCooldownEnabled, enumerable: true})

        if(isDefined(modifications.cooldownSeconds))
            Object.defineProperty(requestObject, "global_cooldown_seconds", {value: modifications.cooldownSeconds, enumerable: true})

        if(isDefined(modifications.isPaused))
            Object.defineProperty(requestObject, "is_paused", {value: modifications.isPaused, enumerable: true})

        if(isDefined(modifications.redemptionsSkipRequestQueue))
            Object.defineProperty(requestObject, "should_redemptions_skip_request_queue", {value: modifications.redemptionsSkipRequestQueue, enumerable: true})

        const response = await axios.patch(`https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}&id=${rewardId}`, requestObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            id: response.data.data[0].id,
            title: response.data.data[0].title,
            prompt: response.data.data[0].prompt,
            cost: response.data.data[0].cost,
            image: {
                url_1x: response.data.data[0].image.url_1x,
                url_2x: response.data.data[0].image.url_2x,
                url_4x: response.data.data[0].image.url_4x
            },
            defaultImage: {
                url_1x: response.data.data[0].default_image.url_1x,
                url_2x: response.data.data[0].default_image.url_2x,
                url_4x: response.data.data[0].default_image.url_4x
            },
            backgroundColor: response.data.data[0].background_color,
            isEnabled: response.data.data[0].is_enabled,
            userInputRequired: response.data.data[0].is_user_input_required,
            maxPerStreamSetting: {
                isEnabled: response.data.data[0].max_per_stream_settings.is_enabled,
                maxPerStream: response.data.data[0].max_per_stream_settings.max_per_stream
            },
            maxPerUserPerStreamSetting: {
                isEnabled: response.data.data[0].max_per_user_per_stream_setting.is_enabled,
                maxPerUserPerStream: response.data.data[0].max_per_user_per_stream_setting.max_per_user_per_stream
            },
            globalCooldownSetting: {
                isEnabled: response.data.data[0].global_cooldown_setting.is_enabled,
                globalCooldown: response.data.data[0].global_cooldown_setting.global_cooldown_seconds
            },
            isPaused: response.data.data[0].is_paused,
            isInStock: response.data.data[0].is_in_stock,
            redemptionsSkipRequestQueue: response.data.data[0].should_redemptions_skip_request_queue,
            redemptionsCountCurrentStream: response.data.data[0].redemptions_redeemed_current_stream,
            cooldownExpiresAt: new Date(response.data.data[0].cooldown_expires_at)
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#update-redemption-status
    /**
     * Updates a redemption’s status.
     * @Tokentype user
     * @Scope channel:manage:redemptions
     * @NOTE: The broadcasterId must match the user ID associated with the user OAuth token.
     * @NOTE2: You may update a redemption only if its status is UNFULFILLED. The app used to create the reward is the only app that may update the redemption.
     * @param broadcasterId The ID of the broadcaster that’s updating the redemption.
     * @param rewardId The ID that identifies the reward that’s been redeemed.
     * @param redemptionIds A list of IDs that identify the redemptions to update.
     * @param newStatus The status to set the redemption to.
     */
    public async updateRedemptionStatus(broadcasterId: string, rewardId: string, redemptionIds: string[], newStatus: RedemptionStatus):Promise<Redemption>{
        const response = await axios.patch(`https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&id=${redemptionIds.join("&id=")}&reward_id=${rewardId}`, {
            status: newStatus
        },{

            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            id: response.data.data[0].id,
            redeemerId: response.data.data[0].user_id,
            redeemerLogin: response.data.data[0].user_login,
            redeemerInput: response.data.data[0].user_input,
            redeemerDisplayName: response.data.data[0].user_name,
            status: response.data.data[0].status,
            redeemedAt: new Date(response.data.data[0].redeemed_at),
            reward: {
                id: response.data.data[0].reward.id,
                title: response.data.data[0].reward.title,
                prompt: response.data.data[0].reward.prompt,
                cost: response.data.data[0].reward.cost
            }
        }
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-charity-campaign
    /**
     * Gets information about the charity campaign that a broadcaster is running.
     * @Tokentype user
     * @Scope channel:read:charity
     * @param broadcasterId The ID of the broadcaster that’s currently running a charity campaign.
     * @return The charity campaign that the broadcaster is currently running. If no one is found or the campaign ended, null will be returned.
     */
    public async getCharityCampaign(broadcasterId: string): Promise<CharityCampaign | null>{

        const response = await axios.get(`https://api.twitch.tv/helix/charity/campaigns?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : response.data.data.map((campaign: any): CharityCampaign=>{
            return {
                id: campaign.id,
                broadcasterId: campaign.broadcaster_id,
                broadcasterLogin: campaign.broadcaster_login,
                broadcasterDisplayName: campaign.broadcaster_name,
                name: campaign.name,
                description: campaign.description,
                logo: campaign.logo,
                website: campaign.website,
                currentAmount:{
                    value: campaign.current_amount.value,
                    decimalPlaces: campaign.current_amount.decimal_places,
                    currency: campaign.current_amount.currency
                },
                targetAmount:{
                    value: campaign.target_amount.value,
                    decimalPlaces: campaign.target_amount.decimal_places,
                    currency: campaign.target_amount.currency
                }
            }
        })


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-charity-campaign-donations
    /**
     * Gets the list of donations that users have made to the broadcaster’s active charity campaign.
     * @Tokentype user
     * @Scope channel:read:charity
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster that’s currently running a charity campaign.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of donations to be returned.
     * @return A list that contains the donations that users have made to the broadcaster’s charity campaign. If no one was found, null will be returned.
     */
    public async getCharityCampaignDonations(broadcasterId: string, options?:{cursor?: string, max?: number}): Promise<{donations: CharityDonation[], cursor: string | null} | null>{
        const donations: CharityDonation[] = [];

        let URL = `https://api.twitch.tv/helix/charity/donations?broadcaster_id=${broadcasterId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const donation of response.data.data){
                donations.push({
                    campaignId: donation.campaign_id,
                    donatorId: donation.user_id,
                    donatorLogin: donation.user_login,
                    donatorDisplayName: donation.user_name,
                    amount:{
                        value: donation.amount.value,
                        decimalPlaces: donation.amount.decimal_places,
                        currency: donation.amount.currency
                    }

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {donations, cursor: cursor!};
                    return donations.length === 0 ? null : {donations, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return donations.length === 0 ? null : {donations, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-chatters
    /**
     * Gets the list of users that are connected to the broadcaster’s chat session.
     * @Tokentype user
     * @Scope moderator:read:chatters
     * @NOTE The moderatorId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster whose list of chatters you want to get.
     * @param moderatorId The ID of the broadcaster or one of the broadcaster’s moderators.
     */
    public async getChatters(broadcasterId: string, moderatorId: string): Promise<User[]> {
        const chatters: User[] = [];

        let URL = `https://api.twitch.tv/helix/channel_points/custom_rewards/redemptions?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&first=100`
        let cursor = undefined;

        while (true) {
            const finalURL: string = `${URL}${!isUndefined(cursor) ? `after=${cursor}` : ""}`

            const response = await axios.get(finalURL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            for (const chatter of response.data.data) {
                chatters.push({
                    id: chatter.user_id,
                    login: chatter.user_login,
                    displayName: chatter.user_name

                })
            }

            if (Object.keys(response.data.pagination).length === 0)
                break;

            cursor = response.data.pagination.cursor;
        }

        return chatters;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-emotes
    /**
     * Gets the broadcaster’s list of custom emotes.
     * @Tokentype user, app
     * @param broadcasterId An ID that identifies the broadcaster whose emotes you want to get.
     * @returns The list of emotes that the specified broadcaster created. If the broadcaster hasn’t created custom emotes, the list is empty.
     */
    public async getChannelEmotes(broadcasterId: string): Promise<Emote[]> {
        const emotes: Emote[] = [];

        const response = await axios.get(`https://api.twitch.tv/helix/chat/emotes?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const emote of response.data.data) {
            emotes.push({
                id: emote.id,
                name: emote.name,
                images: emote.images,
                tier: emote.tier,
                type: emote.emote_type,
                setId: emote.emote_set_id,
                format: emote.format,
                scale: emote.scale,
                themeMode: emote.theme_mode,
            })
        }

        return emotes;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-global-emotes
    /**
     * Gets the list of global emotes.
     * @Tokentype user, app
     * @returns The list of global emotes.
     */
    public async getGlobalEmotes(): Promise<GlobalEmote[]> {
        const emotes: GlobalEmote[] = [];

        const response = await axios.get(`https://api.twitch.tv/helix/chat/emotes/global`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const emote of response.data.data) {
            emotes.push({
                id: emote.id,
                name: emote.name,
                images: emote.images,
                format: emote.format,
                scale: emote.scale,
                themeMode: emote.theme_mode,
            })
        }

        return emotes;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-emote-sets
    /**
     * Gets emotes for one or more specified emote sets.
     * @Tokentype user, app
     * @param setId IDs that identify the emote sets to get.
     */
    public async getEmoteSets(setIds: string[]) {
        const emoteSets: EmoteSet[] = []

        const response = await axios.get(`https://api.twitch.tv/helix/chat/emotes/set?emote_set_id=${setIds.join("&emote_set_id=")}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const emoteSet of response.data.data) {
            emoteSets.push({
                id: emoteSet.id,
                name: emoteSet.name,
                images: emoteSet.images,
                type: emoteSet.emote_type,
                setId: emoteSet.emote_set_id,
                ownerId: emoteSet.owner_id,
                format: emoteSet.format,
                scale: emoteSet.scale,
                themeMode: emoteSet.theme_mode
            })
        }

        return emoteSets;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-chat-badges
    /**
     * Gets the broadcaster’s list of custom chat badges.
     * @Tokentype user, app
     * @param broadcasterId The ID of the broadcaster whose chat badges you want to get.
     * @returns The list of chat badges. The list is sorted in ascending order by set_id, and within a set, the list is sorted in ascending order by id.
     */
    public async getChannelChatBadges(broadcasterId: string): Promise<ChatBadge[]> {
        const badges: ChatBadge[] = [];

        const response = await axios.get(`https://api.twitch.tv/helix/chat/badges?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const chatBadge of response.data.data) {
            badges.push({
                setId: chatBadge.set_id,
                versions: chatBadge.versions,
            })
        }

        return badges;

    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-global-chat-badges
    /**
     * Gets Twitch’s list of chat badges, which users may use in any channel’s chat room
     * @Tokentype user, app
     * @returns The list of global chat badges. The list is sorted in ascending order by set_id, and within a set, the list is sorted in ascending order by id.
     */
    public async getGlobalChatBadges(): Promise<ChatBadge[]> {
        const badges: ChatBadge[] = [];

        const response = await axios.get(`https://api.twitch.tv/helix/chat/badges/global`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const chatBadge of response.data.data) {
            badges.push({
                setId: chatBadge.set_id,
                versions: chatBadge.versions,
            })
        }

        return badges;

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-chat-settings
    /**
     * Gets the broadcaster’s chat settings.
     * @Tokentype user, app
     * @Scope moderator:read:chat_settings
     * @param broadcasterId The ID of the broadcaster whose chat settings you want to get.
     * @param moderatorId The ID of a user that has permission to moderate the broadcaster’s chat room, or the broadcaster’s ID if they’re getting the settings.
     * @returns The list of chat settings. The list contains a single object with all the settings.
     */
    public async getChatSettings(broadcasterId: string, moderatorId?: string): Promise<ChatSettings> {
        const response = await axios.get(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}${!isUndefined(moderatorId) ? `&moderator_id=${moderatorId}` : ""}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            emoteModeActive: response.data.data[0].emote_mode,
            followerModeActive: response.data.data[0].follower_mode,
            followerModeDuration: response.data.data[0].follower_mode_duration,
            moderatorId: response.data.data[0].moderator_id,
            moderatorChatDelayActive: response.data.data[0].non_moderator_chat_delay,
            moderatorChatDelay: response.data.data[0].non_moderator_chat_delay_duration,
            slowModeActive: response.data.data[0].slow_mode,
            slowModeWaitTime: response.data.data[0].slow_mode_wait_time,
            subscriberModeActive: response.data.data[0].subscriber_mode,
            uniqueChatModeActive: response.data.data[0].unique_chat_mode
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#update-chat-settings
    /**
     * Updates the broadcaster’s chat settings.
     * @Tokentype user
     * @Scope moderator:manage:chat_settings
     * @NOTE The moderatorId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster whose chat settings you want to update.
     * @param moderatorId The ID of a user that has permission to moderate the broadcaster’s chat room, or the broadcaster’s ID if they’re making the update. This ID must match the user ID in the user access token.
     * @param [modifications] Possible modifications
     * @param [modifications.emoteModeActive] A Boolean value that determines whether chat messages must contain only emotes.
     * @param [modifications.followerModeActive] A Boolean value that determines whether the broadcaster restricts the chat room to followers only.
     * @param [modifications.followerModeDuration] The length of time, in minutes, that users must follow the broadcaster before being able to participate in the chat room.
     * @param [modifications.moderatorChatDelayActive] A Boolean value that determines whether the broadcaster adds a short delay before chat messages appear in the chat room.
     * @param [modifications.moderatorChatDelay] The amount of time, in seconds, that messages are delayed before appearing in chat.
     * @param [modifications.slowModeActive] A Boolean value that determines whether the broadcaster limits how often users in the chat room are allowed to send messages.
     * @param [modifications.slowModeWaitTime] The amount of time, in seconds, that users must wait between sending messages.
     * @param [modifications.subscriberModeActive] A Boolean value that determines whether only users that subscribe to the broadcaster’s channel may talk in the chat room.
     * @param [modifications.uniqueChatModeActive] A Boolean value that determines whether the broadcaster requires users to post only unique messages in the chat room.
     * @return New chat settings.
     */
    public async updateChatSettings(broadcasterId: string, moderatorId: string, modifications: ChatSettingsModifications):Promise<ChatSettings>{
        const requestObject = {}

        if(isDefined(modifications.emoteModeActive))
            Object.defineProperty(requestObject, "emote_mode", {value: modifications.emoteModeActive, enumerable: true})

        if(isDefined(modifications.followerModeActive)){
            if(modifications.followerModeActive && isDefined(modifications.followerModeDuration)){
                Object.defineProperty(requestObject, "follower_mode_duration", {value: modifications.followerModeDuration, enumerable: true})
            }else{
                throw new Error("No duration for follower mode provided!");
            }
            Object.defineProperty(requestObject, "follower_mode", {value: modifications.followerModeActive, enumerable: true})
        }

        if(isDefined(modifications.moderatorChatDelayActive)){
            if(modifications.moderatorChatDelayActive && isDefined(modifications.moderatorChatDelay)){
                Object.defineProperty(requestObject, "non_moderator_chat_delay_duration", {value: modifications.moderatorChatDelay, enumerable: true})
            }else{
                throw new Error("No duration for moderator chat mode provided!");
            }
            Object.defineProperty(requestObject, "non_moderator_chat_delay", {value: modifications.moderatorChatDelayActive, enumerable: true})
        }

        if(isDefined(modifications.slowModeActive)){
            if(modifications.slowModeActive && isDefined(modifications.slowModeWaitTime)){
                Object.defineProperty(requestObject, "slow_mode_wait_time", {value: modifications.slowModeWaitTime, enumerable: true})
            }else{
                throw new Error("No wait time for slow mode provided!");
            }
            Object.defineProperty(requestObject, "slow_mode", {value: modifications.slowModeActive, enumerable: true})
        }

        if(isDefined(modifications.subscriberModeActive)){
            Object.defineProperty(requestObject, "subscriber_mode", {value: modifications.subscriberModeActive, enumerable: true})
        }

        if(isDefined(modifications.uniqueChatModeActive)){
            Object.defineProperty(requestObject, "unique_chat_mode", {value: modifications.uniqueChatModeActive, enumerable: true})
        }



        const response = await axios.patch(`https://api.twitch.tv/helix/chat/settings?broadcaster_id=${broadcasterId}${!isUndefined(moderatorId) ? `&moderator_id=${moderatorId}` : ""}`, requestObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            emoteModeActive: response.data.data[0].emote_mode,
            followerModeActive: response.data.data[0].follower_mode,
            followerModeDuration: response.data.data[0].follower_mode_duration,
            moderatorId: response.data.data[0].moderator_id,
            moderatorChatDelayActive: response.data.data[0].non_moderator_chat_delay,
            moderatorChatDelay: response.data.data[0].non_moderator_chat_delay_duration,
            slowModeActive: response.data.data[0].slow_mode,
            slowModeWaitTime: response.data.data[0].slow_mode_wait_time,
            subscriberModeActive: response.data.data[0].subscriber_mode,
            uniqueChatModeActive: response.data.data[0].unique_chat_mode
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#send-chat-announcement
    /**
     * Sends an announcement to the broadcaster’s chat room.
     * @Tokentype user
     * @Scope moderator:manage:announcements
     * @NOTE The moderatorId must match the user ID in the user access token.
     * @NOTE If moderatorId was not set, it will default to the broadcaster's id
     * @param broadcasterId The ID of the broadcaster that owns the chat room to send the announcement to.
     * @param message The announcement to make in the broadcaster’s chat room. Announcements are limited to a maximum of 500 characters;
     * @param options
     */
    public async sendChatAnnouncement(broadcasterId: string, message: string, options?: { moderatorId?: string, color?: "blue" | "green" | "orange" | "purple" | "primary" }): Promise<void> {
        const announcementColor = isUndefined(options) ? "primary" : (options!.color ?? "primary")
        const moderatorId = isUndefined(options) ? broadcasterId : (options!.moderatorId ?? broadcasterId)


        await axios.post(`https://api.twitch.tv/helix/chat/announcements?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}}`, {
            message,
            color: announcementColor
        }, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-user-chat-color
    /**
     * Gets the color used for the users' name in chat.
     * @Tokentype user, app
     * @param userIds The ID of the users whose username color you want to get.
     * @returns The list of users and the color code they use for their name.
     */
    public async getUsersChatColor(userIds: string[]): Promise<ChatColor[]> {
        const chatColors: ChatColor[] = [];
        const response = await axios.get(`https://api.twitch.tv/helix/chat/color?user_id=${userIds.join("&user_id=")}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const color of response.data.data) {
            chatColors.push({
                userId: color.user_id,
                userLogin: color.user_login,
                userDisplayName: color.user_name,
                color: color.color
            })
        }

        return chatColors;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#update-user-chat-color
    /**
     * Updates the color used for the user’s name in chat.
     * @Tokentype user
     * @Scope user:manage:chat_color
     * @NOTE The userID must match the user ID in the access token.
     * @NOTE Turbo and Prime users may specify a named color or a Hex color code like #9146FF
     * @param userId The ID of the user whose chat color you want to update.
     * @param color The color to use for the user’s name in chat.
     */
    public async updateUserChatColor(userId: string, color: NamedChatColors | string): Promise<void> {
        //TODO: If hexcolor was provided, go convert it into URL compatible string
        await axios.put(`https://api.twitch.tv/helix/chat/color?user_id=${userId}&color=${color}}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#create-clip
    /**
     * Creates a clip from the broadcaster’s stream.
     * @Tokentype user
     * @Scope clips:edit
     * @NOTE This captures up to 90 seconds of the broadcaster’s stream. The 90 seconds spans the point in the stream from when you called the method.
     * @NOTE By default, Twitch publishes up to the last 30 seconds of the 90 seconds window and provides a default title for the clip
     * @NOTE To specify the title and the portion of the 90 seconds window that’s used for the clip, use the URL in the return
     * @param broadcasterId
     * @param options
     */
    public async createClip(broadcasterId: string, options?: { delayed?: boolean }): Promise<{url: string, id: string}> {
        const delay = isUndefined(options) ? false : options!.delayed ?? false

        const response = await axios.post(`https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}&has_delay=${delay}}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            url: response.data.data[0].edit_url,
            id: response.data.data[0].id
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-clips
    /**
     * Gets one or more video clips that were captured from streams.
     * @Tokentype user, app
     * @NOTE The id, game_id, and broadcaster_id query parameters are mutually exclusive.
     * @param identifiers Possible identifiers
     * @param [identifiers.broadcasterId] An ID that identifies the broadcaster whose video clips you want to get.
     * @param [identifiers.categoryId] An ID that identifies the game whose clips you want to get.
     * @param [identifiers.clipIds] IDs that identify the clip to get.
     * @param [options] Additional optional parameters
     * @param [options.startedAt] The start date used to filter clips.
     * @param [options.endedAt] The end date used to filter clips.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] Maximum amount of clips to be returned.
     * @return List of clips. If no one was found, null will be returned
     */
    public async getClips(identifiers: {broadcasterId?: string, categoryId?: string, clipIds?: string[]}, options?: {startedAt?: Date, endedAt?: Date, cursor?: string, max?: number}):Promise<{clips: Clip[], cursor: string | null} | null>{
        const clips: Clip[] = [];

        let URL = `https://api.twitch.tv/helix/clips?`

        if(isUndefined(identifiers.broadcasterId, identifiers.clipIds, identifiers.categoryId))
            throw new Error("You have to provide at least one identifier!")

        if(isDefined(identifiers.broadcasterId)){
            URL = `${URL}broadcaster_id=${identifiers.broadcasterId}`
        }else if(isDefined(identifiers.categoryId)){
            URL = `${URL}game_id=${identifiers.categoryId}`
        }else{
            URL = `${URL}id=${identifiers.clipIds?.join("&id=")}`
        }

        if(isDefined(options?.startedAt))
            URL = `${URL}&started_at=${options!.startedAt!.toISOString()}`

        if(isDefined(options?.endedAt))
            URL = `${URL}&ended_at=${options!.endedAt!.toISOString()}`



        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const clip of response.data.data){
                clips.push({
                    id: clip.id,
                    url: clip.url,
                    embedUrl: clip.embed_url,
                    broadcasterId: clip.broadcaster_id,
                    broadcasterDisplayName: clip.broadcaster_name,
                    creatorId: clip.creator_id,
                    creatorDisplayName: clip.creator_name,
                    videoId: clip.video_id,
                    categoryId: clip.game_id,
                    language: clip.language,
                    title: clip.title,
                    viewCount: clip.view_count,
                    createdAt: new Date(clip.created_at),
                    thumbnailUrl: clip.thumbnail_url,
                    duration: clip.duration,
                    vodOffset: clip.vod_offset

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {clips, cursor: cursor!};
                    return clips.length === 0 ? null : {clips, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return clips.length === 0 ? null : {clips, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-code-status
    /**
     * Gets the status of one or more redemption codes for a Bits reward.
     * @Tokentype app
     * @NOTE The client ID in the access token must match a client ID that Twitch has approved to provide entitlements.
     * @param codes The redemption codes to check.
     * @param userId The ID of the user that owns the redemption code.
     * @return List of code status. If no one was found, null will be returned
     */
    public async getCodeStatus(codes: string[], userId: string):Promise<Code[] | null>{
        const returnCodes: Code[] = [];

        const response = await axios.get(`https://api.twitch.tv/helix/entitlements/codes?code=${codes.join("&code=")}&user_id=${userId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for(const code of response.data.data){
            returnCodes.push({
                code: code.code,
                status: code.status
            })
        }

        return returnCodes.length === 0 ? null: returnCodes;



    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-drops-entitlements
    /**
     * Gets an organization’s list of entitlements that have been granted to a game, a user, or both.
     * @Tokentype user, app
     * @NOTE The client ID in the access token must own the game. See Reference for more important information!
     * @param [identifiers] Possible identifiers
     * @param [identifiers.entitlementIds] IDs that identifies the entitlement to get.
     * @param [identifiers.granteeId] An ID that identifies a user that was granted entitlements.
     * @param [identifiers.categoryId] An ID that identifies a category that offered entitlements.
     * @param [identifiers.fulfillmentStatus] The entitlement’s fulfillment status.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of entitlements to be returned.
     * @return The list of entitlements. If no one was found, null will be returned.
     */
    public async getDropEntitlements(identifiers?: {entitlementIds?: string[], granteeId?: string, categoryId?: string, fulfillmentStatus?: EntitlementStatus}, options?:{cursor?: string, max?: number}):Promise<{entitlements: DropEntitlement[], cursor: string | null} | null>{
        const entitlements: DropEntitlement[] = [];

        let URL = `https://api.twitch.tv/helix/entitlements/drops?`

        if(isDefined(identifiers?.entitlementIds)){
            URL = URL + `&id=${identifiers?.entitlementIds!.join("&user_id=")}`
        }

        if(isDefined(identifiers?.granteeId)){
            URL = URL + `&user_id=${identifiers?.granteeId!}`
        }

        if(isDefined(identifiers?.categoryId)){
            URL = URL + `&game_id=${identifiers?.categoryId!}`
        }

        if(isDefined(identifiers?.fulfillmentStatus)){
            URL = URL + `&fulfillment_status=${identifiers?.fulfillmentStatus!}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL.replace("?&","?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const entitlement of response.data.data){
                entitlements.push({
                    id: entitlement.id,
                    benefitId: entitlement.benefit_id,
                    timestamp: new Date(entitlement.timestamp),
                    granteeId: entitlement.user_id,
                    categoryId: entitlement.game_id,
                    fulfillmentStatus: entitlement.fulfillment_status,
                    lastUpdated: new Date(entitlement.last_updated)
                })

                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {entitlements, cursor: cursor!};
                    return entitlements.length === 0 ? null : {entitlements, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return entitlements.length === 0 ? null : {entitlements, cursor: null}
    }


    //TODO: https://dev.twitch.tv/docs/api/reference#update-drops-entitlements

    //Reference: https://dev.twitch.tv/docs/api/reference#redeem-code
    /**
     * Redeems one or more redemption codes. Redeeming a code credits the user’s account with the entitlement
     * @Tokentype app
     * @NOTE Only client IDs approved by Twitch may redeem codes on behalf of any Twitch user account.
     * @param codes The redemption codes to redeem.
     * @param userId The ID of the user that owns the redemption code to redeem.
     */
    public async redeemCode(codes: string[], userId: string): Promise<CodeRedemption[]>{
        const redemptions: CodeRedemption[] = [];

        const response = await axios.post(`https://api.twitch.tv/helix/entitlements/codes?code=${codes.join("$code=")}&user_id=${userId}}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for(const redemption of response.data.data){
            redemptions.push({
                code: redemption.code,
                status: redemption.status
            })
        }

        return redemptions;


    }

    //TODO: https://dev.twitch.tv/docs/api/reference#get-extension-configuration-segment

    //TODO: https://dev.twitch.tv/docs/api/reference#set-extension-configuration-segment

    //TODO: https://dev.twitch.tv/docs/api/reference#set-extension-required-configuration

    //Reference: https://dev.twitch.tv/docs/api/reference#send-extension-pubsub-message
    /**
     * Sends a message to one or more viewers.
     * @Tokentype JWT
     * @NOTE: See Reference for more information about the JWT!
     * @param broadcasterId The ID of the broadcaster to send the message to.
     * @param targets The targets of the message. Whisper messsages must have the following structure: whisper-{user-id}
     * @param message The message to send.
     * @param [options] Additional optional parameters
     * @param [options.isGlobalBroadcast] A Boolean value that determines whether the message should be sent to all channels where your extension is active.
     */
    public async sendExtensionPubsubMessage(broadcasterId: string, targets: PubsubMessageTarget[], message: string, options?: {isGlobalbroadcast: boolean}):Promise<void>{
        const requestObject={
            broadcaster_id: broadcasterId,
            target: targets,
            message: message
        }

        if(isDefined(options?.isGlobalbroadcast))
            Object.defineProperty(requestObject, "is_global_broadcaster", {value: options!.isGlobalbroadcast, enumerable: true})

        await axios.post("https://api.twitch.tv/helix/extensions/pubsub", requestObject,{
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-extension-live-channels
    /**
     * Gets a list of broadcasters that are streaming live and have installed or activated the extension.
     * @Tokentype user, app
     * @NOTE: It may take a few minutes for the list to include or remove broadcasters that have recently gone live or stopped broadcasting.
     * @param extensionId The ID of the extension to get. Returns the list of broadcasters that are live and that have installed or activated this extension.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of channels to be returned.
     * @return The list of broadcasters that are streaming live and that have installed or activated the extension. If no one was found, null will be returned.
     */
    public async getExtensionLiveChannels(extensionId: string, options?:{cursor?: string, max?: number}): Promise<{channels: ExtensionLiveChannel[], cursor: string | null} | null>{
        const channels: ExtensionLiveChannel[] = [];

        let URL = `https://api.twitch.tv/helix/extensions/live?extension_id=${extensionId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const channel of response.data.data){
                channels.push({
                    broadcasterId: channel.broadcaster_id,
                    broadcasterDisplayName: channel.broadcaster_name,
                    categoryId: channel.game_id,
                    categoryName: channel.game_name,
                    title: channel.title
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {channels, cursor: cursor!};
                    return channels.length === 0 ? null : {channels, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return channels.length === 0 ? null : {channels, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-extension-secrets
    /**
     * Gets an extension’s list of shared secrets.
     * @Tokentype JWT
     * @param extensionId The ID of the extension whose shared secrets you want to get.
     * @param jwt See information for detailed information!
     * @return The list of shared secrets that the extension created. Null of no one was found
     */
    public async getExtensionSecrets(extensionId: string, jwt: string): Promise<ExtensionSecret[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/extensions/jwt/secrets?extension_id=${extensionId}`,  {
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : response.data.data.map((secret: any): ExtensionSecret =>{
            return {
                formatVersion: secret.format_version,
                secrets: secret.secrets.map((s: any)=>{
                    return {
                        content: s.content,
                        activeAt: new Date(s.active_at),
                        expiresAt: new Date(s.expires_at)
                    }
                })
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#create-extension-secret
    /**
     * Creates a shared secret used to sign and verify JWT tokens.
     * @Tokentype JWT
     * @param extensionId The ID of the extension to apply the shared secret to.
     * @param jwt JSON Web Token (JWT) created by an Extension Backend Service (EBS) for signing (See Reference for more information!)
     * @param options Additional optional parameters
     * @param options.delay The amount of time, in seconds, to delay activating the secret.
     * @return Newly created secret.
     */
    public async createExtensionSecret(extensionId: string, jwt: string, options:{delay?: number}): Promise<ExtensionSecret[] | null>{
        const response = await axios.post(`https://api.twitch.tv/helix/extensions/jwt/secrets?extension_id=${extensionId}${isDefined(options?.delay ) ? `&delay=${options!.delay}` : ""}`, {}, {
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : (response.data.data.map((result: any): ExtensionSecret=>{
            return {
                formatVersion: result.format_version,
                secrets: result.secrets.map((secret: any)=>{
                    return {
                        content: secret.content,
                        activeAt: new Date(secret.active_at),
                        expiresAt: new Date(secret.expires_at)
                    }
                })
            }
        }))[0]
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#send-extension-chat-message
    /**
     * Sends a message to the specified broadcaster’s chat room. The extension’s name is used as the username for the message in the chat room.
     * @Tokentype JWT
     * @param broadcasterId The ID of the broadcaster that has activated the extension.
     * @param extensionId The ID of the extension that’s sending the chat message.
     * @param extensionVersion The extension’s version number.
     * @param text The message. The message may contain a maximum of 280 characters.
     * @param jwt See Reference for detailed information!
     */
    public async sendExtensionChatMessage(broadcasterId: string, extensionId: string, extensionVersion: string, text: string, jwt: string){
        const response = await axios.post(`https://api.twitch.tv/helix/extensions/chat?broadcaster_id=${broadcasterId}`, {
            text,
            extension_id: extensionId,
            extension_version: extensionVersion
        }, {
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-extensions
    /**
     * Gets information about an extension.
     * @Tokentype JWT (see Reference for more information!)
     * @param extensionId The ID of the extension to get.
     * @param options The version of the extension to get.
     */
    public async getExtensions(extensionId: string, jwt: string, options: {extensionVersion: string}):Promise<Extension | null>{


        const response = await axios.get(`https://api.twitch.tv/helix/extensions?extension_id=${extensionId}${isDefined(options?.extensionVersion ) ? `&extension_version=${options!.extensionVersion}` : ""}`, {
            headers: {
                "Authorization": `Bearer ${jwt}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })


        return response.data.data.length === 0 ? null :{
            authorName: response.data.data[0].author_name,
            bitsEnabled: response.data.data[0].bits_enabled,
            canInstall: response.data.data[0].can_install,
            configurationLocation: response.data.data[0].configuration_location,
            description: response.data.data[0].description,
            eulaTosUrl: response.data.data[0].eula_tos_url,
            hasChatSupport: response.data.data[0].has_chat_support,
            iconUrl: response.data.data[0].icon_url,
            iconUrls: response.data.data[0].icon_urls,
            id: response.data.data[0].id,
            name: response.data.data[0].name,
            privacyPolicyUrl: response.data.data[0].privacy_policy_url,
            requestIdentityLink: response.data.data[0].request_identity_link,
            screenshotUrls: response.data.data[0].screenshot_urls,
            state: response.data.data[0].state,
            subscriptionsSupportLevel: response.data.data[0].subscriptions_support_level,
            summary: response.data.data[0].summary,
            supportEmail: response.data.data[0].support_email,
            version: response.data.data[0].version,
            viewerSummary: response.data.data[0].viewer_summary,
            views:{
                mobile:{
                    viewerUrl: response.data.data[0].views.mobile.viewer_url,
                },
                panel: {
                    viewerUrl: response.data.data[0].views.panel.viewer_url,
                    height: response.data.data[0].views.panel.height,
                    canLinkExternalContent: response.data.data[0].views.panel.can_link_external_content
                },
                videoOverlay: {
                    viewerUrl: response.data.data[0].views.video_overlay.viewer_url,
                    canLinkExternalContent: response.data.data[0].views.video_overlay.can_link_external_content
                },
                component:{
                    viewerUrl: response.data.data[0].views.component.viewer_url,
                    aspectRatioX: response.data.data[0].views.component.aspect_ratio_x,
                    aspectRatioY: response.data.data[0].views.component.aspect_ratio_y,
                    autoScale: response.data.data[0].views.component.autoscale,
                    scalePixels: response.data.data[0].views.component.scale_pixels,
                    targetHigh: response.data.data[0].views.component.target_hight,
                    canLinkExternalContent: response.data.data[0].views.component.can_link_external_content
                },
                config: {
                    viewerUrl: response.data.data[0].views.config.viewer_url,
                    canLinkExternalContent: response.data.data[0].views.config.can_link_external_content
                }
            },
            allowlistedConfigUrls: response.data.data[0].allowlisted_config_urls,
            allowlistedPanelUrls: response.data.data[0].allowlisted_panel_urls
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-released-extensions
    /**
     * Gets information about a released extension.
     * @Tokentype user, app
     * @param extensionId The ID of the extension to get.
     * @param [options]
     * @param [options.extensionVersion] The version of the extension to get. If not specified, it returns the latest version.
     * @return The specified released extension. If no one was found, null will be returned
     */
    public async getReleasedExtensions(extensionId: string, options?: {extensionVersion?: string}): Promise<Extension | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/extensions/released?extension_id=${extensionId}${isDefined(options?.extensionVersion ) ? `&extension_version=${options!.extensionVersion}` : ""}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null :{
            authorName: response.data.data[0].author_name,
            bitsEnabled: response.data.data[0].bits_enabled,
            canInstall: response.data.data[0].can_install,
            configurationLocation: response.data.data[0].configuration_location,
            description: response.data.data[0].description,
            eulaTosUrl: response.data.data[0].eula_tos_url,
            hasChatSupport: response.data.data[0].has_chat_support,
            iconUrl: response.data.data[0].icon_url,
            iconUrls: response.data.data[0].icon_urls,
            id: response.data.data[0].id,
            name: response.data.data[0].name,
            privacyPolicyUrl: response.data.data[0].privacy_policy_url,
            requestIdentityLink: response.data.data[0].request_identity_link,
            screenshotUrls: response.data.data[0].screenshot_urls,
            state: response.data.data[0].state,
            subscriptionsSupportLevel: response.data.data[0].subscriptions_support_level,
            summary: response.data.data[0].summary,
            supportEmail: response.data.data[0].support_email,
            version: response.data.data[0].version,
            viewerSummary: response.data.data[0].viewer_summary,
            views:{
                mobile:{
                    viewerUrl: response.data.data[0].views.mobile.viewer_url,
                },
                panel: {
                    viewerUrl: response.data.data[0].views.panel.viewer_url,
                    height: response.data.data[0].views.panel.height,
                    canLinkExternalContent: response.data.data[0].views.panel.can_link_external_content
                },
                videoOverlay: {
                    viewerUrl: response.data.data[0].views.video_overlay.viewer_url,
                    canLinkExternalContent: response.data.data[0].views.video_overlay.can_link_external_content
                },
                component:{
                    viewerUrl: response.data.data[0].views.component.viewer_url,
                    aspectRatioX: response.data.data[0].views.component.aspect_ratio_x,
                    aspectRatioY: response.data.data[0].views.component.aspect_ratio_y,
                    autoScale: response.data.data[0].views.component.autoscale,
                    scalePixels: response.data.data[0].views.component.scale_pixels,
                    targetHigh: response.data.data[0].views.component.target_hight,
                    canLinkExternalContent: response.data.data[0].views.component.can_link_external_content
                },
                config: {
                    viewerUrl: response.data.data[0].views.config.viewer_url,
                    canLinkExternalContent: response.data.data[0].views.config.can_link_external_content
                }
            },
            allowlistedConfigUrls: response.data.data[0].allowlisted_config_urls,
            allowlistedPanelUrls: response.data.data[0].allowlisted_panel_urls
        }



    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-extension-bits-products
    /**
     * Gets the list of Bits products that belongs to the extension.
     * @Tokentype app
     * @NOTE The client ID in the app access token must be the extension’s client ID.
     * @param [options] Additional optional parameters
     * @param [options.shouldIncludeAll] 	A Boolean value that determines whether to include disabled or expired Bits products in the response. The default is false.
     */
    public async getExtensionBitsProducts(options?: {shouldIncludeAll: boolean}): Promise<BitsProduct[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/bits/extensions${isDefined(options?.shouldIncludeAll) ? `?should_include_all=${options!.shouldIncludeAll}` : ""}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : response.data.data.map((product: any): BitsProduct =>{
            return {
                sku: product.skue,
                cost: {
                    amount: product.cost,
                    type: product.type
                },
                inDevelopment: product.in_development,
                displayName: product.display_name,
                expiration: new Date(product.expiration),
                isBroadcast: product.is_broadcast
            }
        })
    }

    //TODO: https://dev.twitch.tv/docs/api/reference#update-extension-bits-product

    //Reference: https://dev.twitch.tv/docs/api/reference#create-eventsub-subscription
    /**
     * Creates an EventSub subscription.
     * @Tokentype user, app (see NOTE)
     * @Scope channel:read:subscriptions
     * @NOTE If you use Webhooks you MUST use an app access token, if you use Websockets you MUST use a user access token.
     * @NOTE You must have aquired a user access token with the correct scope even tho you are using webhooks!
     * @param type The type of subscription to create.
     * @param version The version number that identifies the definition of the subscription type that you want the response to use.
     * @param condition A JSON object that contains the parameter values that are specific to the specified subscription type.
     * @param transport The transport details that you want Twitch to use when sending you notifications.
     * @return Newly created subscription
     */
    public async createEventsubSubscription(type: SubscriptionType, version: string, condition: any, transport: {method: TransportMethod, callback?: string, secret?: string, sessionId: string}): Promise<Subscription>{
        let subscriptionObject = {
            type: type,
            version: version,
            condition: condition,
            transport:{
                method: transport.method
            }
        }

        if(transport.method === TRANSPORT_METHODS.WEBHOOK){
            Object.defineProperty(subscriptionObject.transport, "callback", {value: transport.callback, enumerable: true})
            Object.defineProperty(subscriptionObject.transport, "secret", {value: transport.secret, enumerable: true})
        }

        if(transport.method === TRANSPORT_METHODS.WEBSOCKET){
            Object.defineProperty(subscriptionObject.transport, "session_id", {value: transport.sessionId, enumerable: true})
        }

        const response = await axios.post(`https://api.twitch.tv/helix/eventsub/subscriptions`, subscriptionObject, {
            headers: {
                "Authorization": `Bearer ${transport.method === TRANSPORT_METHODS.WEBHOOK ? this._tokenHandler.appAccessToken : this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        let subscription =  {
            id: response.data.data[0].id,
            status: response.data.data[0].status,
            type: response.data.data[0].type,
            version: response.data.data[0].version,
            condition: response.data.data[0].condition,
            createdAt: new Date(response.data.data[0].created_at),
            transport:{
                method: response.data.data[0].transport.method
            },
            cost: response.data.data[0].cost,
            totalSubscriptions: response.data.total,
            totalCost: response.data.total_cost,
            maxTotalCost: response.data.max_total_cost
        }

        if(transport.method === TRANSPORT_METHODS.WEBHOOK){
            Object.defineProperty(subscription.transport, "callback", {value: response.data.data[0].transport.callback, enumerable: true})
            Object.defineProperty(subscription.transport, "secret", {value: response.data.data[0].transport.secret, enumerable: true})
        }

        if(transport.method === TRANSPORT_METHODS.WEBSOCKET){
            Object.defineProperty(subscription.transport, "session_id", {value: response.data.data[0].transport.sessionId, enumerable: true})
        }

        return subscription;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#delete-eventsub-subscription
    /**
     * Deletes an EventSub subscription.
     * @param id The ID of the subscription to delete.
     * @param usedMethod Transport method used for receiving the event. Websocket or Webhook
     */
    public async deleteEventsubSubscription(id: string, usedMethod: TransportMethod){
        await axios.delete(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${id}`, {
            headers: {
                "Authorization": `Bearer ${usedMethod === TRANSPORT_METHODS.WEBSOCKET ? this._tokenHandler.userAccessToken : this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-eventsub-subscriptions
    /**
     * Gets information about all broadcasts on Twitch
     * @Tokentype user
     * @Scope channel:read:subscriptions
     * @NOTE If you use Webhooks you MUST use an app access token, if you use Websockets you MUST use a user access token.
     * @NOTE You must have aquired a user access token with the correct scope even tho you are using webhooks!
     * @param options Additional optional parameters
     * @param options.status Filter subscriptions by its status.
     * @param options.type Filter subscriptions by subscription type.
     * @param options.userIds Filter subscriptions by user IDs
     * @param options.max Maximum number of returned subscriptions
     * @param options.cursor The cursor used to get the next page of results.
     * @return List of subscription. If no one was found, null will be returned
     */
    public async getEventsubSubscription(options?: {status: SubscriptionStatus, type?: SubscriptionType, userIds?: string[], max?: number, cursor?: string}):Promise<{subscriptions: Subscription[], cursor: string | null} | null>{
        const subscriptions: Subscription[] = [];

        let URL = `https://api.twitch.tv/helix/eventsub/subscriptions?`

        if(isDefined(options?.userIds)){
            URL = URL + `&user_id=${options!.userIds!.join("&user_id=")}`
        }

        if(isDefined(options?.type)){
            URL = URL + `&type=${options!.type}`
        }

        if(isDefined(options?.status)){
            URL = URL + `&status=${options!.status}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}&first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}&after=${cursor}`

            const response = await axios.get(URL.replace("?&", "?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const subscription of response.data.data){
                const subscriptionObject = {
                    id: subscription.user_id,
                    status: subscription.status,
                    type: subscription.type,
                    version: subscription.version,
                    condition: subscription.condition,
                    createdAt: new Date(subscription.created_at),
                    transport: {
                        method: subscription.transport.method,
                    },
                    cost: subscription.cost
                }

                if(subscriptionObject.transport.method === TRANSPORT_METHODS.WEBHOOK){
                    Object.defineProperty(subscriptionObject.transport, "callback", {value: subscription.transport.callback, enumerable: true})
                    Object.defineProperty(subscriptionObject.transport, "secret", {value: subscription.transport.secret, enumerable: true})
                }

                if(subscriptionObject.transport.method === TRANSPORT_METHODS.WEBSOCKET){
                    Object.defineProperty(subscriptionObject.transport, "session_id", {value: subscription.transport.sessionId, enumerable: true})
                }
                subscriptions.push(subscriptionObject)
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {subscriptions, cursor: cursor!};
                    return subscriptions.length === 0 ? null : {subscriptions, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                return subscriptions.length === 0 ? null : {subscriptions, cursor: null}
            }
        }


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-top-games
    /**
     * Gets information about all broadcasts on Twitch.
     * @Tokentype user, app
     * @param options
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] Maximum number of returned subscriptions.
     */
    public async getTopGames(options?: {cursor?: string, max?: number}):Promise<{games: Category[], cursor: string | null} | null>{
        const games: Category[] = [];

        let URL = `https://api.twitch.tv/helix/games/top?`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}&first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}&after=${cursor}`

            const response = await axios.get(URL.replace("?&", "?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const game of response.data.data){
                games.push({
                    id: game.id,
                    name: game.name,
                    boxArtUrl: game.box_art_url,
                    igdbId: game.igdb_id,
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {games, cursor: cursor!};
                    return games.length === 0 ? null : {games, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                return games.length === 0 ? null : {games, cursor: null}
            }
        }
    }


    /**
     * Gets information about specified categories or games.
     * @Reference https://dev.twitch.tv/docs/api/reference#get-games
     * @Tokentype user, app
     * @NOTE At least one id, name or igdId must be provided!
     * @param identifiers Available types of game/category identifier
     * @param [options] Additional options
     * @param [options.size] Size of resulting box art urls.
     * @param [identifiers.ids] The IDs of the categories or game to get.
     * @param [identifiers.names] The names of the categories or game to get.
     * @param [identifiers.igdbIds] The IGDB IDs of the games to get
     * @returns The list of categories and games. The list is empty if the specified categories and games weren’t found.
     */
    public async getGames(identifiers: {ids?: string[], names?: string[], igdbIds?: string[]}, options?: {size?:{width: number, height: number}}): Promise<Category[]>{
        const games: Category[] = [];

        const idsArr = !isUndefined(identifiers.ids) ? identifiers.ids!.map((id)=>`id=${id}`) : [];
        const namesArr = !isUndefined(identifiers.names) ? identifiers.names!.map((id)=>`name=${id}`) : [];
        const igdbArr = !isUndefined(identifiers.igdbIds) ? identifiers.igdbIds!.map((id)=>`igdb_id=${id}`) : [];

        const paramsArr = idsArr.concat(namesArr.concat(igdbArr)).join("&")

        if(paramsArr.length === 0)
            throw new Error("No identifier provided! You must at least provide one id, name or igdbId")

        const response = await axios.get(`https://api.twitch.tv/helix/games?${paramsArr}`,{
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for(const game of response.data.data){
            games.push({
                id: game.id,
                name: game.name,
                boxArtUrl: (!isUndefined(options) && !isUndefined(options!.size)) ? game.box_art_url.replace("{width}", options!.size!.width).replace("{height}", options!.size!.height) : game.box_art_url,
                igdbId: game.igdb_id
            })
        }

        return games;
    }

    /**
     * Gets information about specified category.
     * @Reference https://dev.twitch.tv/docs/api/reference#get-games
     * @Tokentype user, app
     * @NOTE At least one id, name or igdId must be provided!
     * @param identifiers Available types of game/category identifier
     * @param [options] Additional options
     * @param [options.size] Size of resulting box art urls.
     * @param [identifiers.ids] The IDs of the categories or game to get.
     * @param [identifiers.names] The names of the categories or game to get
     * @returns The list of categories and games. The list is empty if the specified categories weren’t found.
     */
    public async getCategory(identifiers: {ids?: string[], names?: string[]}, options?: {size?:{width: number, height: number}}): Promise<Category[]>{
        return (await this.getGames(identifiers, options)).map((category)=>{
            delete category.igdbId
            return category
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-creator-goals
    /**
     * Gets the broadcaster’s list of active goals.
     * @Tokentype user
     * @Scope channel:read:goals
     * @NOTE The broadcasterId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that created the goals.
     * @return List of active goals. If no one was found, null will be returned
     */
    public async getCreatorGoals(broadcasterId: string): Promise<Goal[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/goals?broadcaster_id=${broadcasterId}`,{
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        if(response.data.data.length === 0)
            return null;

        return response.data.data.map((goalData: any): Goal =>{
            return {
                id: goalData.id,
                broadcasterId: goalData.broadcaster_id,
                brodcasterLogin: goalData.broadcaster_login,
                broadcasterDisplayName: goalData.broadcaster_name,
                type: goalData.type,
                description: goalData.description,
                currentAmount: goalData.current_amount,
                targetAmount: goalData.target_amount,
                createdAt: new Date(goalData.created_at)
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-hype-train-events
    /**
     * Gets information about the broadcaster’s current or most recent Hype Train event.
     * @Tokentype user
     * @Scope channel:read:hype_train
     * @NOTE The broadcasterId must match the User ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that’s running the Hype Train.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of hyptrain events to be returned.
     * @return The list of Hype Train events. If no one was found, null will be returned.
     */
    public async getHypeTrainEvents(broadcasterId: string, options?:{cursor?: string, max?: number}): Promise<{events: HypeTrainEvent[], cursor: string | null} | null>{
        const events: HypeTrainEvent[] = [];

        let URL = `https://api.twitch.tv/helix/hypetrain/events?broadcaster_id=${broadcasterId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const event of response.data.data){
                events.push({
                    id: event.id,
                    type: event.event_type,
                    timestamp: new Date(event.event_timestamp),
                    version: event.version,
                    data: event.data.map((dat: any)=>{
                        return {
                            broadcasterId: dat.broadcaster_id,
                            cooldownEndTime: dat.cooldown_end_time,
                            expiresAt: new Date(dat.expires_at),
                            goal: dat.goal,
                            hypetrainId: dat.id,
                            lastContribution:{
                                total: dat.last_contribution.total,
                                type: dat.last_contribution.type,
                                contributorId: dat.last_contribution.user
                            },
                            level: dat.level,
                            startedAt: new Date(dat.started_at),
                            topContributions: dat.top_contributions.map((con: any)=>{
                                return {
                                   total: con.total,
                                   type: con.type,
                                   contributorId: con.user
                                }
                            }),
                            total: dat.total
                        }
                    })

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {events, cursor: cursor!};
                    return events.length === 0 ? null : {events, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return events.length === 0 ? null : {events, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#check-automod-status
    /**
     * Checks whether AutoMod would flag the specified message for review.
     * @Tokentype user
     * @Scope moderation:read
     * @param broadcasterId The ID of the broadcaster whose AutoMod settings and list of blocked terms are used to check the message.
     * @return The list of checking results.
     */
    public async checkAutoModStatus(broadcasterId: string, messages: MessageCheck[]): Promise<MessageCheckResult[] | null>{
        const response = await axios.post(`https://api.twitch.tv/helix/moderation/enforcements/status?broadcaster_id=${broadcasterId}`, messages,{
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.map((value: any): MessageCheckResult=>{
            return {
                checkId: value.msg_id,
                isPermitted: value.is_permitted
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#manage-held-automod-messages
    /**
     * Allow or deny the message that AutoMod flagged for review.
     * @Tokentype user
     * @Scope moderator:manage:automod
     * @param moderatorId The moderator who is approving or denying the held message.
     * @param messageId The ID of the message to allow or deny.
     * @param action The action to take for the message.
     */
    public async manageHeldAutoModMessages(moderatorId: string, messageId: string, action: MessageModerationAction): Promise<void>{
        await axios.post(`https://api.twitch.tv/helix/moderation/automod/message`, {
            user_id: moderatorId,
            msg_id: messageId,
            action
        }, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-automod-settings
    /**
     * Gets the broadcaster’s AutoMod settings.
     * @Tokentype user
     * @Scope moderator:read:automod_settings
     * @param broadcasterId The ID of the broadcaster whose AutoMod settings you want to get.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @return List of AutoMod settings. If none is configured, null will be returned
     */
    public async getAutoModSettings(broadcasterId: string, moderatorId: String): Promise<AutoModSettings[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/moderation/automod/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.map((setting: any) : AutoModSettings=>{
            return {
                broadcasterId: setting.broadcaster_id,
                moderatorId: setting.moderator_id,
                overallLevel: setting.overall_level,
                disability: setting.disability,
                aggression: setting.aggression,
                sexualitySexOrGender: setting.sexuality_sex_or_gender,
                misogyny: setting.misogyny,
                bullying: setting.bullying,
                swearing: setting.swearing,
                raceEthnicityOrReligion: setting.race_ethnicity_or_religion,
                sexBasedTerms: setting.sex_based_terms
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#update-automod-settings
    /**
     * Updates the broadcaster’s AutoMod settings.
     * @Tokentype user
     * @Scope moderator:manage:automod_settings
     * @NOTE The moderatorId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster whose AutoMod settings you want to update.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param newSettings New settings, all must be set!
     * @param newSettings.aggression The Automod level for hostility involving aggression.
     * @param newSettings.bullying The Automod level for hostility involving name calling or insults.
     * @param newSettings.disability The Automod level for discrimination against disability.
     * @param newSettings.misogyny The Automod level for discrimination against women.
     * @param newSettings.overallLevel The default AutoMod level for the broadcaster.
     * @param newSettings.raceEthnicityOrReligion The Automod level for racial discrimination.
     * @param newSettings.sexBasedTerms The Automod level for sexual content.
     * @param newSettings.sexualitySexOrGender The AutoMod level for discrimination based on sexuality, sex, or gender.
     * @param newSettings.swearing The Automod level for profanity.
     * @return Newly created settings
     */
    public async updateAutoModSettings(broadcasterId: string, moderatorId: string, newSettings: {aggression: number, bullying: number, disability: number, misogyny: number, overallLevel: number, raceEthnicityOrReligion: number, sexBasedTerms: number, sexualitySexOrGender: number, swearing: number}): Promise<AutoModSettings>{
        const response = await axios.post(`https://api.twitch.tv/helix/moderation/automod/settings?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, newSettings, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            moderatorId: response.data.data[0].moderator_id,
            overallLevel: response.data.data[0].overall_level,
            disability: response.data.data[0].disability,
            aggression: response.data.data[0].aggression,
            sexualitySexOrGender: response.data.data[0].sexuality_sex_or_gender,
            misogyny: response.data.data[0].misogyny,
            bullying: response.data.data[0].bullying,
            swearing: response.data.data[0].swearing,
            raceEthnicityOrReligion: response.data.data[0].race_ethnicity_or_religion,
            sexBasedTerms: response.data.data[0].sex_based_terms
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-banned-users
    /**
     * Gets all users that the broadcaster banned or put in a timeout.
     * @param broadcasterId The ID of the broadcaster whose list of banned users you want to get.
     * @param options Additional optional parameters
     * @param options.userIds A list of user IDs used to filter the results.
     * @param options.max Maximum amount of banned user to return
     * @return List of banned users and cursor for later usage if not all banned users are returned
     */
    public async getBannedUsers(broadcasterId: string, options?: {userIds?: string[], max?: number, cursor?: string}): Promise<{ bannedUsers: BannedUser[], cursor: string | null } | null>{
        const bannedUsers: BannedUser[] = [];

        let URL = `https://api.twitch.tv/helix/moderation/banned?broadcaster_id=${broadcasterId}`

        if(isDefined(options?.userIds)){
                URL = URL + `&user_id=${options!.userIds!.join("&user_id=")}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}&first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}&after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const ban of response.data.data){
                bannedUsers.push({
                    userId: ban.user_id,
                    userLogin: ban.user_login,
                    userDisplayName: ban.user_name,
                    expiresAt: ban.expires_at == "" ? null : new Date(ban.expires_at),
                    createdAt: new Date(ban.created_at),
                    reason: ban.reason,
                    moderatorId: ban.moderator_id,
                    moderatorLogin: ban.moderator_login,
                    moderatorDisplayName: ban.moderator_name

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {bannedUsers, cursor: cursor!};
                    return bannedUsers.length === 0 ? null : {bannedUsers, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
    }

        return bannedUsers.length === 0 ? null : {bannedUsers, cursor: null}

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#ban-user
    /**
     * Bans a user from participating in the specified broadcaster’s chat room or puts them in a timeout.
     * @Tokentype user
     * @Scope moderator:manage:banned_users
     * @param broadcasterId The ID of the broadcaster whose chat room the user is being banned from.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param userId The ID of the user to ban or put in a timeout.
     * @param options Additional optional ban information
     * @param options.duration The amount of seconds to ban the user for. Min: 1, Max 1209600 (2 Weeks). Dont use this if you want the user permanently
     * @param options.reason The reason the you’re banning the user or putting them in a timeout.
     */
    public async banUser(broadcasterId: string, moderatorId: string, userId: string, options?: {duration?: number, reason?: string}): Promise<BanResult>{
        const banObject = {
            user_id: userId
        }
        if(!isUndefined(options)){
            if(options!.duration)
                Object.defineProperty(banObject, "duration", {value: options!.duration, enumerable: true})
            if(options!.reason)
                Object.defineProperty(banObject, "reason", {value: options!.reason, enumerable: true})
        }

        const response = await axios.post(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id${broadcasterId}&moderator_id${moderatorId}`, banObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            moderatorId: response.data.data[0].moderator_id,
            userId: response.data.data[0].user_id,
            createdAt: new Date(response.data.data[0].created_at),
            endTime: new Date(response.data.data[0].end_time)
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#unban-user
    /**
     * Removes the ban or timeout that was placed on the specified user.
     * @Tokentype user
     * @Scope moderator:manage:banned_users
     * @param broadcasterId The ID of the broadcaster whose chat room the user is banned from chatting in.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param userId The ID of the user to remove the ban or timeout from.
     */
    public async unbanUser(broadcasterId: string, moderatorId: string, userId: string){
        await axios.post(`https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}&user_id=${userId}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-blocked-terms
    /**
     * Gets the broadcaster’s list of non-private, blocked words or phrases.
     * @Tokentype user
     * @Scope moderator:read:blocked_terms
     * @NOTE The moderatorId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster whose blocked terms you’re getting.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] Maximum amount of blocked terms to be returned
     * @return List of blocked terms. If no one was found, null will be returned
     */
    public async getBlockedTerms(broadcasterId: string, moderatorId: string, options?: {cursor?: string, max?: number}): Promise<{terms: BlockedTerm[], cursor: string | null} | null>{
        const blockedTerms: BlockedTerm[] = [];

        let URL = `https://api.twitch.tv/helix/moderation/blocked_terms?$broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}&first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}&after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const term of response.data.data){
                blockedTerms.push({
                    broadcasterId: term.broadcaster_id,
                    moderatorId: term.moderator_id,
                    id: term.id,
                    text: term.text,
                    createdAt: new Date(term.created_at),
                    updatedAt: new Date(term.updated_at),
                    expiresAt: new Date(term.expires_at)
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {terms: blockedTerms, cursor: cursor!};
                    return blockedTerms.length === 0 ? null : {terms: blockedTerms, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                return blockedTerms.length === 0 ? null : {terms: blockedTerms, cursor: null}
            }
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#add-blocked-term
    /**
     * Adds a word or phrase to the broadcaster’s list of blocked terms.
     * @Tokentype user
     * @Scope moderator:manage:blocked_terms
     * @param broadcasterId The ID of the broadcaster that owns the list of blocked terms.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param text The word or phrase to block from being used in the broadcaster’s chat room.
     * @return Summary object of added term
     */
    public async addBlockedTerm(broadcasterId: string, moderatorId: string, text: string): Promise<BlockedTerm>{
        const response = await axios.post(`https://api.twitch.tv/helix/moderation/blocked_terms?broadcaster_id${broadcasterId}&moderator_id${moderatorId}`, {text}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
        return {
            broadcasterId: response.data.data[0].broadcaster_id,
            moderatorId: response.data.data[0].moderator_id,
            id: response.data.data[0].id,
            text: response.data.data[0].text,
            createdAt: new Date(response.data.data[0].created_at),
            updatedAt: new Date(response.data.data[0].updated_at),
            expiresAt: new Date(response.data.data[0].expires_at)
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#remove-blocked-term
    /**
     * Removes the word or phrase from the broadcaster’s list of blocked terms.
     * @Tokentype user
     * @Scope moderator:manage:blocked_terms
     * @param broadcasterId The ID of the broadcaster that owns the list of blocked terms.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param termId The ID of the blocked term to remove from the broadcaster’s list of blocked terms.
     */
    public async removeBlockedTerm(broadcasterId: string, moderatorId: string, termId: string): Promise<void> {
        await axios.delete(`https://api.twitch.tv/helix/moderation/blocked_terms?broadcaster_id${broadcasterId}&moderator_id${moderatorId}&id=${termId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#delete-chat-messages
    /**
     * Removes a single chat message or all chat messages from the broadcaster’s chat room.
     * @Tokentype user
     * @Scope moderator:manage:chat_messages
     * @NOTE Restrictions: The message must have been created within the last 6 hours, The message must not belong to the broadcaster, The message must not belong to another moderator
     * @param broadcasterId The ID of the broadcaster that owns the chat room to remove messages from.
     * @param moderatorId The ID of the broadcaster or a user that has permission to moderate the broadcaster’s chat room.
     * @param options Additionally optional parameters
     * @param options.messageId The ID of the message to remove. If not specified, all messages in the chatroom will be removed!
     */
    public async deleteChatMessages(broadcasterId: string, moderatorId: string, options?: {messageId?: string}): Promise<void>{
        let URL = `https://api.twitch.tv/helix/moderation/chat?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`

        if(!isUndefined(options) && !isUndefined(options!.messageId))
            URL = `${URL}&message_id=${options!.messageId!}`

        await axios.delete(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

    }



    //Reference: https://dev.twitch.tv/docs/api/reference#get-moderators
    public async getModerators(broadcasterId: string, options?: {userIds?: string[], max?: number, cursor?: string}): Promise<{ moderators: User[], cursor: string | null } | null>{
        const moderators: User[] = [];

        let URL = `https://api.twitch.tv/helix/moderation/moderators?broadcaster_id=${broadcasterId}`

        if(isDefined(options?.userIds)){
            URL = URL + `&user_id=${options!.userIds!.join("&user_id=")}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const ban of response.data.data){
                moderators.push({
                    id: ban.user_id,
                    login: ban.user_login,
                    displayName: ban.user_name
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(moderators.length === 0)

                    if(isDefined(cursor))
                        return {moderators, cursor: cursor!};
                    return moderators.length === 0 ? null : {moderators, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return moderators.length === 0 ? null : {moderators, cursor: null}
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#add-channel-moderator
    /**
     * Adds a moderator to the broadcaster’s chat room.
     * @Tokentype user
     * @Scope channel:manage:moderators
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster that owns the chat room. This ID must match the user ID in the access token.
     * @param userId The ID of the user to add as a moderator in the broadcaster’s chat room.
     */
    public async addChannelModerator(broadcasterId: string, userId: string): Promise<void>{
        await axios.post(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id${broadcasterId}&user_id${userId}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#remove-channel-moderator
    /**
     * Removes a moderator from the broadcaster’s chat room.
     * @Tokentype user
     * @Scope channel:manage:moderators
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster that owns the chat room.
     * @param userId The ID of the user to remove as a moderator from the broadcaster’s chat room.
     */
    public async removeChannelModerator(broadcasterId: string, userId: string): Promise<void>{
        await axios.delete(`https://api.twitch.tv/helix/moderation/moderators?broadcaster_id${broadcasterId}&user_id${userId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-vips
    /**
     * Gets a list of the broadcaster’s VIPs.
     * @Tokentype user
     * @Scope channel:read:vips
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster whose list of VIPs you want to get.
     * @param [options] Additional optional parameters
     * @param [options.userIds] Filters the list for specific VIPs.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] Maximum amount of vips to be returned. If no one was found, null will be returned
     */
    public async getVIPs(broadcasterId: string, options?: {userIds?: string[], cursor?: string, max?: number}): Promise<{vips: User[], cursor: string | null} | null>{
        try{
            const vips: User[] = [];

            let URL = `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}`

            if(isDefined(options?.userIds))
                URL = `${URL}&user_id=${options!.userIds!.join("&user_id=")}`

            let cursor = options?.cursor
            let count = 0;
            let pageSize = 100
            while(true){

                if(isDefined(options?.max) && count + pageSize > options!.max!)
                    pageSize = options!.max! - count;

                URL = `${URL}&first=${pageSize}`

                if (isDefined(cursor))
                    URL = `${URL}&after=${cursor}`

                const response = await axios.get(URL, {
                    headers: {
                        "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                        "Client-Id": this._tokenHandler.clientId
                    }
                })

                cursor = response.data.pagination.cursor;

                for (const vip of response.data.data){
                    vips.push({
                        id: vip.user_id,
                        login: vip.user_login,
                        displayName: vip.user_name
                    })
                    count++;


                    if(isDefined(options?.max) && count === options!.max){
                        if(isDefined(cursor))
                            return {vips, cursor: cursor!};
                        return vips.length === 0 ? null : {vips, cursor: null}
                    }
                }

                if(isUndefined(cursor)){
                    return vips.length === 0 ? null : {vips, cursor: null}
                }
            }
        }catch(err: any){
            throw new Exception(err.response.data.error, err.response.data.message)
        }


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#add-channel-vip
    /**
     * Adds the specified user as a VIP in the broadcaster’s channel.
     * @Tokentype user
     * @Scope channel:manage:vips
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster that’s adding the user as a VIP.
     * @param userId The ID of the user to give VIP status to.
     */
    public async addChannelVIP(broadcasterId: string, userId: string): Promise<void>{
        try{
            await axios.post(`https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`, {}, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })
        }catch(err: any){
            throw new Exception(err.response.data.error, err.response.data.message)
        }


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#remove-channel-vip
    /**
     * Removes the specified user as a VIP in the broadcaster’s channel.
     * @Tokentype user
     * @Scope channel:manage:vips
     * @NOTE If the broadcaster wants to remove a VIP, the broadcasterId must match the user ID in the access token
     * @NOTE If a VIP wants to remove his VIP status, the userId must match the user ID in the access token
     * @param broadcasterId The ID of the broadcaster who owns the channel where the user has VIP status.
     * @param userId The ID of the user to remove VIP status from.
     */
    public async removeChannelVIP(broadcasterId: string, userId: string): Promise<void>{

        try{
            await axios.delete(`https://api.twitch.tv/helix/channels/vips?broadcaster_id=${broadcasterId}&user_id=${userId}`, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })
        }catch(err: any){
            throw new Exception(err.response.data.error, err.response.data.message)
        }

    }

    //BUG: The TwitchAPI does not return the documented properties. Therefore only the is_active field will be returned.
    //Reference: https://dev.twitch.tv/docs/api/reference#update-shield-mode-status
    /**
     * Activates or deactivates the broadcaster’s Shield Mode.
     * @Tokentype user
     * @Scope moderator:manage:shield_mode
     * @NOTE The moderatorId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster whose Shield Mode you want to activate or deactivate.
     * @param moderatorId The ID of the broadcaster or a user that is one of the broadcaster’s moderators.
     * @param isActive A Boolean value that determines whether to activate Shield Mode. Set to true to activate Shield Mode; otherwise, false to deactivate Shield Mode.
     * @return A Boolean that determines whether the shield mode is active or inactive after the call.
     */
    public async updateShieldModeStatus(broadcasterId: string, moderatorId: string, isActive: boolean):Promise<boolean>{
        try{
            const response = await axios.put(`https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, {
                is_active: isActive
            },{
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            return response.data.data[0].is_active;
        }catch (err: any){
            throw new Exception(err.response.data.error, err.response.data.message)
        }

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-shield-mode-status
    /**
     * Gets the broadcaster’s Shield Mode activation status.
     * @Tokentype user
     * @Scope moderator:read:shield_mode or moderator:manage:shield_mode
     * @NOTE The moderatorId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster whose Shield Mode activation status you want to get.
     * @param moderatorId The ID of the broadcaster or a user that is one of the broadcaster’s moderators
     * @return The broadcaster’s Shield Mode status if active. If it's not active, null will be returned!
     */
    public async getShieldModeStatus(broadcasterId: string, moderatorId: string): Promise<ShieldModeStatus>{
        try{
            const response = await axios.get(`https://api.twitch.tv/helix/moderation/shield_mode?broadcaster_id=${broadcasterId}&moderator_id=${moderatorId}`, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            return {
                isActive: response.data.data[0].is_active,
                moderatorId: response.data.data[0].moderator_id,
                moderatorLogin: response.data.data[0].moderator_login,
                moderatorDisplayName: response.data.data[0].moderator_name,
                lastActivatedAt: new Date(response.data.data[0].last_activated_at)
            }
        }catch(err: any){
            throw new Exception(err.response.data.error, err.response.data.message)
        }

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-polls
    /**
     * Gets a list of polls that the broadcaster created.
     * @Tokentype user
     * @Scope channel:read:polls
     * @NOTE The broadcasterId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that created the polls.
     * @param [options] Additional optional parameters
     * @param [options.pollIds] A list of IDs that identify the polls to return.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of polls to be returned.
     */
    public async getPolls(broadcasterId: string, options?: {pollIds?: string[], cursor?: string, max?: number}):Promise<{polls: Poll[], cursor: string | null} | null>{
        const polls: Poll[] = [];

        let URL = `https://api.twitch.tv/helix/polls?broadcaster_id=${broadcasterId}`

        if(isDefined(options?.pollIds)){
            URL = URL + `&id=${options!.pollIds!.join("&id=")}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const poll of response.data.data){
                polls.push({
                    id: poll.id,
                    broadcasterId: poll.broadcaster_id,
                    broadcasterLogin: poll.broadcaster_login,
                    broadcasterDisplayName: poll.broadcaster_name,
                    title: poll.title,
                    choices: poll.choices.map((choice: any)=>{
                        return {
                            id: choice.id,
                            title: choice.title,
                            votes: choice.votes,
                            channelPointsVotes: choice.channel_points_votes,
                            bitsVotes: choice.bits_votes
                        }
                    }),
                    bitsVoting: poll.bits_voting_enabled,
                    bitsPerVote: poll.bits_per_vote,
                    channelPointsVoting: poll.channel_points_voting_enabled,
                    channelPointsPerVote: poll.channel_points_per_vote,
                    status: poll.status,
                    duration: poll.duration,
                    startedAt: new Date(poll.started_at),
                    endedAt: new Date(poll.ended_at)

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {polls, cursor: cursor!};
                    return polls.length === 0 ? null : {polls, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return polls.length === 0 ? null : {polls, cursor: null}
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#create-poll
    /**
     * Creates a poll that viewers in the broadcaster’s channel can vote on.
     * @Tokentype user
     * @Scope channel:manage:polls
     * @NOTE The broadcasterId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that’s running the poll. This ID must match the user ID in the user access token.
     * @param title The question that viewers will vote on.
     * @param choices A list of choices that viewers may choose from.
     * @param duration The length of time (in seconds) that the poll will run for.
     * @param options
     * @param options.channelsPointVoting A Boolean value that indicates whether viewers may cast additional votes using Channel Points.
     * @param options.channelPointsPerVote The number of points that the viewer must spend to cast one additional vote.
     * @returns A list that contains the single poll that you created.
     */
    public async createPoll(broadcasterId: string, title: string, choices: string[], duration: number, options?: {channelPointsVoting?: boolean, channelPointsPerVote?: number }): Promise<Poll>{
       const requestBody = {
           broadcaster_id: broadcasterId,
           title: title,
           choices: choices.map((choice: string)=>{title: choice}),
           duration: duration,
       }
        if(!isUndefined(options) && !isUndefined(options!.channelPointsVoting))
           Object.defineProperty(requestBody, "channel_points_voting_enabled", {value: options!.channelPointsVoting, enumerable: true})

        if(!isUndefined(options) && !isUndefined(options!.channelPointsPerVote))
           Object.defineProperty(requestBody, "channel_points_per_vote", {value: options!.channelPointsPerVote, enumerable: true})

        const response = await axios.post(`https://api.twitch.tv/helix/polls`, requestBody, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            title: response.data.data[0].title,
            choices: response.data.data[0].choices,
            bitsVoting: response.data.data[0].bits_voting_enabled,
            bitsPerVote: response.data.data[0].bits_per_vote,
            channelPointsVoting: response.data.data[0].channel_points_voting_enabled,
            channelPointsPerVote: response.data.data[0].channel_points_per_vote,
            status: response.data.data[0].status,
            duration: response.data.data[0].duration,
            startedAt: response.data.data[0].started_at,
            endedAt: response.data.data[0].ended_at

        }


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#end-poll
    /**
     * Ends an active poll.
     * @Tokentype user
     * @Scope channel:manage:polls
     * @NOTE The broadcasterId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that’s running the poll.
     * @param pollId The ID of the poll to update.
     * @param status The status to set the poll to. Possible case-sensitive values are: TERMINATED and ARCHIVED
     */
    public async endPoll(broadcasterId: string, pollId: string, status: "ARCHIVED" | "TERMINATED"): Promise<Poll>{
        const response = await axios.post(`https://api.twitch.tv/helix/polls`, {
            broadcaster_id: broadcasterId,
            id: pollId,
            status: status
        }, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            title: response.data.data[0].title,
            choices: response.data.data[0].choices,
            bitsVoting: response.data.data[0].bits_voting_enabled,
            bitsPerVote: response.data.data[0].bits_per_vote,
            channelPointsVoting: response.data.data[0].channel_points_voting_enabled,
            channelPointsPerVote: response.data.data[0].channel_points_per_vote,
            status: response.data.data[0].status,
            duration: response.data.data[0].duration,
            startedAt: response.data.data[0].started_at,
            endedAt: response.data.data[0].ended_at

        }
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-predictions
    /**
     * Gets a list of Channel Points Predictions that the broadcaster created.
     * @Tokentype user
     * @Scope channel:read:predictions
     * @NOTE The broadcasterId must match the user ID associated with the user access token.
     * @param broadcasterId The ID of the broadcaster whose predictions you want to get.
     * @param [options] Additional optional parameters
     * @param [options.predictionIds] The ID of the prediction to get.
     * @param [options.cursor] 	The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of predictions to be returned.
     */
    public async getPredictions(broadcasterId: string, options?: {predictionIds?: string[], cursor?: string | null, max?: number }){
        const predictions: Prediction[] = [];

        let URL = `https://api.twitch.tv/helix/predictions?broadcaster_id=${broadcasterId}`

        if(isDefined(options?.predictionIds)){
            URL = URL + `&id=${options!.predictionIds!.join("&id=")}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const prediction of response.data.data){
                predictions.push({
                    id: prediction.id,
                    broadcasterId: prediction.broadcaster_id,
                    broadcasterLogin: prediction.broadcaster_login,
                    broadcasterDisplayName: prediction.broadcaster_name,
                    title: prediction.title,
                    winningOutcomeId: prediction.winning_outcome_id,
                    outcomes: prediction.outcomes.map((outcome: any)=>{
                        return {
                            id: outcome.id,
                            title: outcome.title,
                            users: outcome.users,
                            channelPoints: outcome.channel_points,
                            topPredictors: outcome.topPredictors.map((predictor: any)=>{
                                return {
                                    userId: predictor.user_id,
                                    userDisplayName: predictor.user_name,
                                    userLogin: predictor.user_login,
                                    channelPointsUsed: predictor.channel_points_used,
                                    channelPointsWon: predictor.channel_points_won,
                                }
                            }),
                            color: outcome.color
                        }
                    }),
                    predictionWindow: prediction.predictions_windows,
                    status: prediction.status,
                    createdAt: new Date(prediction.created_at),
                    endedAt: new Date(prediction.ended_at),
                    lockedAt: new Date(prediction.locked)

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {predictions, cursor: cursor!};
                    return predictions.length === 0 ? null : {predictions, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return predictions.length === 0 ? null : {predictions, cursor: null}
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#create-prediction
    /**
     * Creates a Channel Points Prediction.
     * @Tokentype user
     * @Scope channel:manage:predictions
     * @param broadcasterId The ID of the broadcaster that’s running the prediction.
     * @param title The question that the broadcaster is asking.
     * @param outcomes The list of possible outcomes that the viewers may choose from.
     * @param predictionWindow The length of time (in seconds) that the prediction will run for.
     * @return The newly created prediction
     */
    public async createPrediction(broadcasterId: string, title: string, outcomes: string[], predictionWindow: number): Promise<Prediction | null>{
        const response = await axios.post("https://api.twitch.tv/helix/predictions", {
            broadcaster_id: broadcasterId,
            title,
            outcomes: outcomes.map((title)=> {title}),
            prediction_window: predictionWindow
        }, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            title: response.data.data[0].title,
            winningOutcomeId: response.data.data[0].winning_outcome_id,
            outcomes: response.data.data[0].outcomes.map((outcome: any)=>{
                return {
                    id: outcome.id,
                    title: outcome.title,
                    users: outcome.users,
                    channelPoints: outcome.channel_points,
                    topPredictors: outcome.topPredictors.map((predictor: any)=>{
                        return {
                            userId: predictor.user_id,
                            userDisplayName: predictor.user_name,
                            userLogin: predictor.user_login,
                            channelPointsUsed: predictor.channel_points_used,
                            channelPointsWon: predictor.channel_points_won,
                        }
                    }),
                    color: outcome.color
                }
            }),
            predictionWindow: response.data.data[0].predictions_windows,
            status: response.data.data[0].status,
            createdAt: new Date(response.data.data[0].created_at),
            endedAt: new Date(response.data.data[0].ended_at),
            lockedAt: new Date(response.data.data[0].locked)

        }
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#end-prediction
    /**
     * Locks, resolves, or cancels a Channel Points Prediction.
     * @Tokentype user
     * @Scope channel:manage:predictions
     * @NOTE The broadcasterId must match the user ID in the user access token.
     * @param broadcasterId The ID of the broadcaster that’s running the prediction.
     * @param predictionId The ID of the prediction to update.
     * @param status The status to set the prediction to.
     * @param [options] Additional optional parameters
     * @param [options.winningOutcomeId] The ID of the winning outcome.
     * @return Recently updated prediction
     */
    public async endPrediction(broadcasterId: string, predictionId: string, status: PredictionStatus, options?: {winningOutcomeId?: string}):Promise<Prediction | null>{
        const requestObject = {
            broadcaster_id: broadcasterId,
            id: predictionId,
            status,

        }

        if(isDefined(options?.winningOutcomeId))
            Object.defineProperty(requestObject, "winning_outcome_id", {value: options!.winningOutcomeId, enumerable: true})

        const response = await axios.patch("https://api.twitch.tv/helix/predictions", requestObject, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            title: response.data.data[0].title,
            winningOutcomeId: response.data.data[0].winning_outcome_id,
            outcomes: response.data.data[0].outcomes.map((outcome: any)=>{
                return {
                    id: outcome.id,
                    title: outcome.title,
                    users: outcome.users,
                    channelPoints: outcome.channel_points,
                    topPredictors: outcome.topPredictors.map((predictor: any)=>{
                        return {
                            userId: predictor.user_id,
                            userDisplayName: predictor.user_name,
                            userLogin: predictor.user_login,
                            channelPointsUsed: predictor.channel_points_used,
                            channelPointsWon: predictor.channel_points_won,
                        }
                    }),
                    color: outcome.color
                }
            }),
            predictionWindow: response.data.data[0].predictions_windows,
            status: response.data.data[0].status,
            createdAt: new Date(response.data.data[0].created_at),
            endedAt: new Date(response.data.data[0].ended_at),
            lockedAt: new Date(response.data.data[0].locked)

        }
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#start-a-raid
    /**
     * Raid another channel by sending the broadcaster’s viewers to the targeted channel
     * @Tokentype user
     * @Scope channel:manage:raids
     * @NOTE The fromBroadcasterId must match the user ID associated with the user access token.
     * @param fromBroadcasterId The ID of the broadcaster that’s sending the raiding party.
     * @param toBroadcasterId The ID of the broadcaster to raid.
     * @returns A single object with information about the pending raid.
     */
    public async startRaid(fromBroadcasterId: string, toBroadcasterId: string){
        const response = await axios.post(`https://api.twitch.tv/helix/raids?from_broadcaster_id=${fromBroadcasterId}&to_broadcaster_id=${toBroadcasterId}}`, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            createdAt: new Date(response.data.data.created_at),
            isMature: response.data.data.is_mature
        }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#cancel-a-raid
    /**
     * Cancel a pending raid.
     * @Tokentype user
     * @Scope channel:manage:raids
     * @NOTE The broadcasterId must match the user ID associated with the user access token.
     * @param broadcasterId The ID of the broadcaster that initiated the raid.
     */
    public async cancelRaid(broadcasterId: string): Promise<void>{
        await axios.delete(`https://api.twitch.tv/helix/raids?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }

    //TODO: https://dev.twitch.tv/docs/api/reference#get-channel-stream-schedule


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-icalendar
    /**
     * Gets the broadcaster’s streaming schedule as an iCalendar.
     * @param broadcasterId The ID of the broadcaster that owns the streaming schedule you want to get.
     * @return iCalendar data
     */
    public async getChannelICalendar(broadcasterId: string):Promise<string>{
        const response = await axios.get(`https://api.twitch.tv/helix/schedule/icalendar?broadcaster_id=${broadcasterId}`)
        return response.data;
    }

    //TODO: https://dev.twitch.tv/docs/api/reference#update-channel-stream-schedule

    //TODO: https://dev.twitch.tv/docs/api/reference#create-channel-stream-schedule-segment

    //TODO: https://dev.twitch.tv/docs/api/reference#update-channel-stream-schedule-segment

    //TODO: https://dev.twitch.tv/docs/api/reference#delete-channel-stream-schedule-segment

    //Reference: https://dev.twitch.tv/docs/api/reference#search-categories
    /**
     * Gets the games or categories that match the specified query.
     * @Tokentype user, app
     * @param query The URI-encoded search string.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of categories to be returned.
     * @return The list of categories that match the query. If no one was found, null will be returned.
     */
    public async searchCategories(query: string, options?: {cursor?: string, max?: number}): Promise<null | {categories: Category[], cursor: string | null}>{
        const categories: Category[] = [];

        let URL = `https://api.twitch.tv/helix/search/categories?query=${query}`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const category of response.data.data){
                categories.push({
                   boxArtUrl: category.box_art_url,
                    name: category.name,
                    id: category.id
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {categories, cursor: cursor!};
                    return categories.length === 0 ? null : {categories, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return categories.length === 0 ? null : {categories, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#search-channels
    /**
     * Gets the channels that match the specified query and have streamed content within the past 6 months.
     * @Tokentype user, app
     * @param query The URI-encoded search string.
     * @param [options] Additional optional parameters
     * @param [options.liveOnly] A Boolean value that determines whether the response includes only channels that are currently streaming live.
     * @param [options.cursor] 	The cursor used to get the next page of results.
     * @param [options.max] The maxmimum amount of channels to be returned.
     * @return The list of channels that match the query. If no one was found, null will be returned.
     */
    public async searchChannels(query: string, options?: {liveOnly: boolean, cursor?: string, max?: number}): Promise<null | {channels: Channel[], cursor: string | null}>{
        const channels: Channel[] = [];

        let URL = `https://api.twitch.tv/helix/search/channels?query=${query}`

        if(isDefined(options?.liveOnly))
            URL = `${URL}&live_only=${options!.liveOnly}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const channel of response.data.data){
                channels.push({
                    broadcasterLanguage: channel.broadcaster_language,
                    broadcasterLogin: channel.broadcaster_login,
                    broadcasterDisplayName: channel.display_name,
                    categoryId: channel.game_id,
                    categoryName: channel.game_name,
                    id: channel.id,
                    isLive: channel.is_live,
                    tagIds: channel.tag_ids,
                    thumbnailUrl: channel.thumbnail_url,
                    title: channel.title,
                    startedAt: new Date(channel.started_at)
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {channels, cursor: cursor!};
                    return channels.length === 0 ? null : {channels, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return channels.length === 0 ? null : {channels, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-soundtrack-current-track
    /**
     * Gets the Soundtrack track that the broadcaster is playing.
     * @Tokentype user, app
     * @param broadcasterId The ID of the broadcaster that’s playing a Soundtrack track.
     * @return Currently playing track. If no one is playing, null will be returned.
     */
    public async getSoundtrackCurrentTrack(broadcasterId: string){


        let URL = `https://api.twitch.tv/helix/soundtrack/current_track?broadcaster_id=${broadcasterId}`

        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })


        return response.data.data.length === 0 ? null : {
                    album:{
                        id: response.data.data[0].album.id,
                        imageUrl: response.data.data[0].album.image_url,
                        name: response.data.data[0].album.name
                    },
                    artists: response.data.data[0].artists.map((artist: any)=>{
                        return {
                            creatorChannelId: artist.creator_channel_id,
                            id: artist.id,
                            name: artist.name
                        }
                    }),
                    duration: response.data.data[0].duration,
                    id: response.data.data[0].id,
                    isrc: response.data.data[0].isrc,
                    title: response.data.data[0].title,
                    source:{
                        contentType: response.data.data[0].source.content_type,
                        id: response.data.data[0].source.id,
                        imageUrl: response.data.data[0].source.image_url,
                        soundtrackUrl: response.data.data[0].source.soundtrack_url,
                        spotifyUrl: response.data.data[0].source.spotify_url,
                        title: response.data.data[0].source.title
                    }
                }
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-soundtrack-playlist
    /**
     * Gets the Soundtrack playlist’s tracks.
     * @Tokentype user, app
     * @param playlistId The ID of the playlist to get.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of tracks to be returned.
     * @return The playlist’s list of tracks. If no one was found, null will be returned.
     */
    public async getSoundtrackPlaylist(playlistId: string, options?:{cursor?: string, max?: number}):Promise<null | {cursor: string | null, tracks: PlaylistTrack[]}>{
        const tracks: PlaylistTrack[] = [];

        let URL = `https://api.twitch.tv/helix/soundtrack/playlist?id=${playlistId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const track of response.data.data){
                tracks.push({
                    album:{
                        id: track.album.id,
                        imageUrl: track.album.image_url,
                        name: track.album.name
                    },
                    artists: track.artists.map((artist: any)=>{
                        return {
                            creatorChannelId: artist.creator_channel_id,
                            id: artist.id,
                            name: artist.name
                        }
                    }),
                    duration: track.duration,
                    id: track.id,
                    isrc: track.isrc,
                    title: track.title
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {tracks, cursor: cursor!};
                    return tracks.length === 0 ? null : {tracks, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return tracks.length === 0 ? null : {tracks, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-soundtrack-playlists
    /**
     * Gets a list of Soundtrack playlists.
     * @Tokentype user, app
     * @param [options] Additional optional parameters
     * @param [options.playlistId] The ID of the playlist to get. Specify an ID only if you want to get a single playlist instead of all playlists.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of playlist to be returned.
     * @return The list of Soundtrack playlists. If no one was found, null will be returned.
     */
    public async getSoundtrackPlaylists(options?:{ playlistId?: string, cursor?: string, max?: number}):Promise<null | {cursor: string | null, playlists: SoundtrackPlaylist[]}>{
        const playlists: SoundtrackPlaylist[] = [];

        let URL = `https://api.twitch.tv/helix/soundtrack/playlists?${isDefined(options?.playlistId) ? `id=${options!.playlistId}` : ""}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const playlist of response.data.data){
                playlists.push({
                    id: playlist.id,
                    description: playlist.description,
                    imageUrl: playlist.image_url,
                    title: playlist.title
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {playlists, cursor: cursor!};
                    return playlists.length === 0 ? null : {playlists, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return playlists.length === 0 ? null : {playlists, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-stream-key
    /**
     * Gets the channel’s stream key.
     * @Tokentype user
     * @Scope channel:read:stream_key
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The ID of the broadcaster that owns the channel.
     * @return The channel’s stream key.
     */
    public async getStreamKey(broadcasterId: string): Promise<string>{
        const response = await axios.get(`https://api.twitch.tv/helix/streams/key?broadcaster_id${broadcasterId}`,{
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
        return response.data.data[0].stream_key;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-streams
    /**
     * Gets a list of all streams.
     * @Tokentype user, app
     * @param [options.broadcasterIds] Broadcaster ids used to filter the list of streams.
     * @param [options.broadcasterLogins] Broadcaster login names used to filter the list of streams.
     * @param [options.categoryIds] Game/Category ids used to filter the list of streams.
     * @param [options.type] The type of stream to filter the list of streams by.
     * @param [options.language] A language code used to filter the list of streams.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of streams to be returned
     * @return The list of streams. If no one was found, null will be returned
     */
    public async getStreams(options?:{broadcasterIds?: string[], broadcasterLogins?: string[], categoryIds?: string[], type?: StreamTypes | "all", language?: Languages, cursor?: string, max?: number}): Promise<{streams: Stream[], cursor: string | null} | null>{
        const streams: Stream[] = [];

        let URL = "https://api.twitch.tv/helix/streams?"

        if(isDefined(options?.broadcasterIds)){
            URL = URL + `&user_id=${options!.broadcasterIds!.join("&user_id=")}`
        }

        if(isDefined(options?.broadcasterLogins)){
            URL = URL + `&user_login=${options!.broadcasterLogins!.join("&user_login=")}`
        }

        if(isDefined(options?.categoryIds)){
            URL = URL + `&game_id=${options!.categoryIds!.join("&game_id=")}`
        }

        if(isDefined(options?.type)){
            URL = URL + `&type=${options!.type}`
        }

        if(isDefined(options?.language)){
            URL = URL + `&type=${options!.language}`
        }

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL.replace("?&", "?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const stream of response.data.data){
                streams.push({
                    id: stream.id,
                    broadcasterId: stream.user_id,
                    broadcasterLogin: stream.user_login,
                    broadcasterDisplayName: stream.user_name,
                    categoryId: stream.game_id,
                    categoryName: stream.game_name,
                    type: stream.type,
                    title: stream.title,
                    viewerCount: stream.viewer_count,
                    startedAt: new Date(stream.started_at),
                    language: stream.language,
                    thumbnailUrl: stream.thumbnail_url,
                    tagIds: stream.tag_ids,
                    isMature: stream.is_mature
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {streams: streams, cursor: cursor!};
                    return streams.length === 0 ? null : {streams: streams, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return streams.length === 0 ? null : {streams: streams, cursor: null}
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-followed-streams
    /**
     * Gets the list of broadcasters that the user follows and that are streaming live.
     * @Tokentype user
     * @Scope user:read:follows
     * @NOTE The userId must match the user ID in the access token.
     * @param userId The ID of the user whose list of followed streams you want to get.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of streams to be returned. If no one was found, null will be returned.
     * @return The list of live streams of broadcasters that the specified user follows.
     */
    public async getFollowedStreams(userId: string, options?: {cursor?: string, max?: number}): Promise<{streams: Stream[], cursor: string | null} | null>{
        const streams: Stream[] = [];

        let URL = `https://api.twitch.tv/helix/streams/followed?user_id=${userId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const stream of response.data.data){
                streams.push({
                    id: stream.id,
                    broadcasterId: stream.user_id,
                    broadcasterLogin: stream.user_login,
                    broadcasterDisplayName: stream.user_name,
                    categoryId: stream.game_id,
                    categoryName: stream.game_name,
                    type: stream.type,
                    title: stream.title,
                    viewerCount: stream.viewer_count,
                    startedAt: new Date(stream.started_at),
                    language: stream.language,
                    thumbnailUrl: stream.thumbnail_url,
                    tagIds: stream.tag_ids,
                    isMature: stream.is_mature
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {streams: streams, cursor: cursor!};
                    return streams.length === 0 ? null : {streams: streams, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return streams.length === 0 ? null : {streams: streams, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#create-stream-marker
    /**
     * Adds a marker to a live stream.
     * @Tokentype user
     * @Scope channel:manage:broadcast
     * @NOTE The broadcasterId must match the user ID in the access token or the user in the access token must be one of the broadcaster’s editors.
     * @param broadcasterId The ID of the broadcaster that’s streaming content.
     * @param options
     * @param options.description A short description of the marker to help the user remember why they marked the location.
     */
    public async createStreamMarker(broadcasterId: string, options?: {description?: string}): Promise<Marker>{
        const descriptionParameter = `${isUndefined(options) ? "" : (isUndefined(options!.description) ? "" : `&description=${options!.description}`)}`
        const URL = `https://api.twitch.tv/helix/streams/markers?user_id=${broadcasterId}${descriptionParameter}`
        const response = await axios.post(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            createdAt: new Date(response.data.data[0].created_at),
            position: response.data.data[0].position_seconds,
            description: response.data.data[0].description
        }

    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-stream-markers
    /**
     * Gets a list of markers from the user’s most recent stream or from the specified VOD/video.
     * @Tokentype user
     * @Scope user:read:broadcast
     * @NOTE The userId must match the user ID in the access token or the user in the access token must be one of the broadcaster’s editors.
     * @param userId A user ID. The request returns the markers from this user’s most recent video.
     * @param videoId A video on demand (VOD)/video ID.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of markers to be returned.
     */
    public async getStreamMarkers(userId: string, videoId: string, options?:{cursor?: string, max?: number}): Promise<null | {cursor: string | null, markers: StreamMarker[]}>{
        const markers: StreamMarker[] = [];

        let URL = `https://api.twitch.tv/helix/streams/markers?user_id=${userId}&video_id=${videoId}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const marker of response.data.data){
                markers.push({
                    creatorId: marker.user_id,
                    creatorLogin: marker.user_login,
                    creatorDisplayName: marker.user_name,
                    videos: marker.videos.map((video: any)=>{
                        return {
                            id: video.video_id,
                            markers: video.markers.map((marker: any)=>{
                                return {
                                    id: marker.id,
                                    createdAt: new Date(marker.created_at),
                                    description: marker.description,
                                    position: marker.position_seconds,
                                    url: marker.url
                                }
                            })
                        }

                    })
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {markers, cursor: cursor!};
                    return markers.length === 0 ? null : {markers, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return markers.length === 0 ? null : {markers, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-broadcaster-subscriptions
    /**
     * Gets a list of users that subscribe to the specified broadcaster.
     * @Tokentype user
     * @Scope channel:read:subscriptions
     * @NOTE The broadcasterId must match the user ID in the access token.
     * @param broadcasterId The broadcaster’s ID.
     * @param [options] Additional optional parameters
     * @param [options.userId] Filters the list to include only the specified subscribers.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of subscribers to be returned.
     * @return The list of users that subscribe to the broadcaster. If no one was found, null will be returned.
     */
    public async getBroadcasterSubscriptions(broadcasterId: string, options?: {userId: string, cursor?: string, max?: number}): Promise< {subscriptions: BroadcasterSubscription[], cursor: string | null} | null>{
        const subscriptions: BroadcasterSubscription [] = [];

        let URL = `https://api.twitch.tv/helix/subscriptions?broadcaster_id=${broadcasterId}${isDefined(options?.userId) ? `&user_id=${options!.userId}` : ""}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const subscription of response.data.data){
                subscriptions.push({
                    broadcasterId: subscription.broadcaster_id,
                    broadcasterLogin: subscription.broadcaster_login,
                    broadcasterDisplayName: subscription.broadcaster_name,
                    gifterId: subscription.gifter_id,
                    gifterLogin: subscription.gifter_login,
                    gifterDisplayName: subscription.gifter_name,
                    isGift: subscription.is_gift,
                    planName: subscription.plan_name,
                    tier: subscription.tier,
                    userId: subscription.user_id,
                    userLogin: subscription.user_login,
                    userDisplayName: subscription.user_name,

                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {subscriptions, cursor: cursor!};
                    return subscriptions.length === 0 ? null : {subscriptions, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return subscriptions.length === 0 ? null : {subscriptions, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#check-user-subscription
    /**
     * Checks whether the user subscribes to the broadcaster’s channel.
     * @Tokentype user
     * @Scope user:read:subscriptions
     * @NOTE The userId must match the user ID in the access Token.
     * @param broadcasterId The ID of a partner or affiliate broadcaster.
     * @param userId The ID of the user that you’re checking to see whether they subscribe to the broadcaster in broadcaster_id.
     * @return Information about the user’s subscription. If no one was found, null will be returned.
     */
    public async checkUserSubscription(broadcasterId: string, userId: string): Promise<null | UserSubscription>{
        const response = await axios.get(`https://api.twitch.tv/helix/subscriptions/user?broadcasater_id=${broadcasterId}&user_id=${userId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null :{
            broadcasterId: response.data.data[0].broadcaster_id,
            broadcasterLogin: response.data.data[0].broadcaster_login,
            broadcasterDisplayName: response.data.data[0].broadcaster_name,
            gifterId: response.data.data[0].gifter_id,
            gifterLogin: response.data.data[0].gifter_login,
            gifterDisplayName: response.data.data[0].gifter_name,
            isGift: response.data.data[0].is_gift,
            tier: response.data.data[0].tier
        }

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-all-stream-tags
    /**
     * Gets a list of all stream tags that Twitch defines.
     * @Tokentype user, app
     * @param [options] Additional optional parameters
     * @param [options.tagIds] The IDs of the tags to get
     * @param [options.cursor] 	The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of tags to be returned. If no one was found, null will be returned.
     */
    public async getAllStreamTags(options?:{tagIds?: string[], cursor?: string, max?: number}):Promise<{tags: StreamTag[], cursor: string | null} | null>{
        const tags: StreamTag[] = [];

        let URL = `https://api.twitch.tv/helix/tags/streams?${isDefined(options?.tagIds) ? `tag_id=${options!.tagIds!.join("&tag_id=")}` : ""}`


        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const tag of response.data.data){
                tags.push({
                    id: tag.tag_id,
                    isAuto: tag.is_auto,
                    localizationNames: tag.localization_names,
                    localizationDescription: tag.localization_descriptions
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {tags, cursor: cursor!};
                    return tags.length === 0 ? null : {tags, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return tags.length === 0 ? null : {tags, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-stream-tags
    /**
     * Gets the list of stream tags that the broadcaster or Twitch added to their channel.
     * @Tokentype user, app
     * @param broadcasterId The ID of the broadcaster whose stream tags you want to get.
     * @param [options] Additional optional parameters
     * @param [options.max] Maximum amount of stream tags to be returned
     * @return List of stream tags. If no one was found, null will be returned
     */
    public async getStreamTags(broadcasterId: string, options?: {max?: number}): Promise<StreamTag[] | null>{
        const tags: StreamTag[] = [];

        let count = 0;

        const response = await axios.get(`https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })


        for (const tag of response.data.data){
            tags.push({
                id: tag.tag_id,
                isAuto: tag.is_auto,
                localizationNames: tag.localization_names,
                localizationDescription: tag.localization_descriptions
            })
            count++;


            if(isDefined(options?.max) && count === options!.max){
                return tags.length === 0 ? null : tags
            }
        }

        return tags.length === 0 ? null : tags
    }




    //Reference: https://dev.twitch.tv/docs/api/reference#replace-stream-tags
    /**
     * Applies one or more tags to the specified channel, overwriting existing tags.
     * @Tokentype user
     * @Scope channel:manage:broadcast
     * @param broadcasterId The ID of the broadcaster that owns the channel to apply the tags to.
     * @param [options] Additional optional parameters
     * @param [options.tagIds] A list of IDs that identify the tags to apply to the channel.
     */
    public async replaceStreamTags(broadcasterId: string, options?: {tagIds?: string[]}): Promise<void> {
        const requestObject= {
            tags_ids: isDefined(options?.tagIds) ? options!.tagIds : []
        }

        await axios.put(`https://api.twitch.tv/helix/streams/tags?broadcaster_id=${broadcasterId}`, requestObject,{
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-channel-teams
    /**
     * Gets the list of Twitch teams that the broadcaster is a member of.
     * @Tokentype user, app
     * @param broadcasterId The ID of the broadcaster whose teams you want to get.
     * @param [options] Additional optional parameters
     * @param [options.max] Maximum amount of teams to be returned
     * @return List of teams. If no one was found, null will be returned
     */
    public async getChannelTeams(broadcasterId: string, options?: {max?: number}): Promise<getChannelTeamResult[] | null>{
        const teams: getChannelTeamResult[] = [];

        let count = 0;

        const response = await axios.get(`https://api.twitch.tv/helix/teams/channel?broadcaster_id=${broadcasterId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for (const team of response.data.data){
            teams.push({
                broadcasterId: team.broadcaster_id,
                broadcasterLogin: team.broadcaster_login,
                broadcasterDisplayName: team.broadcaster_name,
                team: {
                    backgroundImageUrl: team.background_image_url,
                    banner: team.banner,
                    createdAt: new Date(team.created_at),
                    updatedAt: new Date(team.updated_at),
                    info: team.info,
                    thumbnailUrl: team.thumbnail_url,
                    name: team.team_name,
                    displayName: team.team_display_name,
                    id: team.id
                }
            })
            count++;


            if(isDefined(options?.max) && count === options!.max){
                return teams.length === 0 ? null : teams
            }
        }

        return teams.length === 0 ? null : teams
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-teams
    /**
     * Gets information about the specified Twitch team.
     * @Tokentype user, app
     * @param [identifiers] Mutually exclusive team identifiers
     * @param [identifiers.name] The name of the team to get.
     * @param [identifiers.id] The ID of the team to get.
     */
    public async getTeams(identifiers?: {name?: string, id?: string}):Promise<Team[] | null>{

        const teams: Team[] = [];

        if(isUndefined(identifiers))
            throw new Error("You must at least specify a team name or team id");

        if(isUndefined(identifiers?.name) && isUndefined(identifiers?.id))
            throw new Error("You must at least specify a team name or team id");


        const response = await axios.get(`https://api.twitch.tv/helix/teams?${isDefined(identifiers?.name ? `name=${identifiers!.name}` : `id=${identifiers!.id}`)}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for(const team of response.data.data){
            teams.push({
                users: team.users.map((user: any)=>{
                    return {
                        userId: user.user_id,
                        userLogin: user.user_login,
                        userName: user.user_name
                    }
                }),
                backgroundImageUrl: team.background_image_url,
                banner: team.banner,
                createdAt: new Date(team.created_at),
                updatedAt: new Date(team.updated_at),
                info: team.info,
                thumbnailUrl: team.thumbnail_url,
                name: team.team_name,
                displayName: team.team_display_name,
                id: team.id
            })
        }

        return teams.length === 0 ? null : teams;


    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-users
    /**
     * Gets information about one or more users.
     * @Tokentype user, app
     * @Scope user:read:email
     * @NOTE Use userIds whenever possible due to the possibility of changing login names!
     * @NOTE If you don’t specify IDs or login names, the request returns information about the user in the access token if you specify a user access token.
     * @param options
     * @param options.userIds The IDs of the users to get.
     * @param options.userLogins The login names of the users to get.
     */
    public async getUsers(options?: {userIds?: string[], userLogins?: string[]}): Promise<User[]>{
        const users: User[] = [];

        let URL = `https://api.twitch.tv/helix/users?`
        if(!isUndefined(options)){
            let userIdParameter = isUndefined(options) ? "" : !isUndefined(options!.userIds) ? `user_id=${options!.userIds!.join("&user_id=")}` : ""
            let userLoginParameter = isUndefined(options) ? "" : !isUndefined(options!.userLogins) ? `login=${options!.userLogins!.join("&login=")}` : ""

            const parameters = `${userIdParameter}${isUndefined(options!.userIds) ? "" : "&"}${userLoginParameter}`
            URL = `${URL}${parameters}`
        }

        const response = await axios.get(URL, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        for(const user of response.data.data){
            users.push({
                id: user.id,
                login: user.login,
                displayName: user.display_name,
                type: user.type,
                broadcasterType: user.broadcaster_type,
                description: user.description,
                profileImageURL: user.profile_image_url,
                offlineImageURL: user.offline_image_url,
                viewCount: user.view_count,
                email: user.email,
                createdAt: new Date(user.created_at)
            })
        }

        return users;
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#update-user
    /**
     * Updates the specified user’s information.
     * @Tokentype user
     * @Scope user:edit, to include email in reponse, add user:read:email
     * @NOTE The user ID in the OAuth token identifies the user whose information you want to update.
     * @param newDescription The string to update the channel’s description to
     * @return The single user that you updated
     */
    public async updateUser(newDescription?: string):Promise<User>{
        const response = await axios.put(`https://api.twitch.tv/helix/users?description=${isDefined(newDescription) ? newDescription : ""}`,{}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return {
            id: response.data.data[0].id,
            login: response.data.data[0].login,
            displayName: response.data.data[0].display_name,
            type: response.data.data[0].type,
            broadcasterType: response.data.data[0].broadcaster_type,
            description: response.data.data[0].description,
            profileImageURL: response.data.data[0].profile_image_url,
            offlineImageURL: response.data.data[0].offline_image_url,
            viewCount: response.data.data[0].view_count,
            email: response.data.data[0].email,
            createdAt: new Date(response.data.data[0].created_at)
        }
    }


    /**
     * Updates a users description text
     * @HELPER
     * @Tokentype user
     * @Scope user:edit, to include email in reponse, add user:read:email
     * @NOTE The user ID in the OAuth token identifies the user whose information you want to update.
     * @param newDescription The string to update the channel’s description to
     * @return The single user that you updated
     */
    public async updateDescription(newDescription?: string): Promise<User>{
        return this.updateUser(newDescription);
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-users-follows
    /**
     * Gets information about users that are following other users.
     * @Tokentype user, app
     * @NOTE Read Reference for detailed information. Or see helper functions called getFollowers(), getFollowees(), isFollowing()
     * @param [identifiers] Possible identifiers, at least one of both must be provided
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of relationships to be returned.
     * @return The list of follower-followee relationship information. If no one was found, null will be returned
     */
    public async getUsersFollows(identifiers:{followerId?: string, followeeId?: string}, options?:{cursor?: string, max?: number}):Promise<{total: number, relationships: FollowRelationship[], cursor: string | null} | null>{
        const relationships: FollowRelationship[] = [];

        if(isUndefined(identifiers.followerId) && isUndefined(identifiers.followeeId))
            throw new Error("Follower ID or Followee ID must be provided!");

        let URL = `https://api.twitch.tv/helix/users/follows?`

        if(isDefined(identifiers.followerId))
            URL = `&from_id=${URL}${identifiers!.followerId}`

        if(isDefined(identifiers.followeeId))
            URL = `&to_id=${URL}${identifiers!.followeeId}`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        let total = 0;

        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL.replace("?&", "?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            total = response.data.total;

            cursor = response.data.pagination.cursor;

            for (const relationship of response.data.data){
                relationships.push({
                    followerId: relationship.from_id,
                    followerLogin: relationship.from_login,
                    followerDisplayName: relationship.from_name,
                    followeeId: relationship.to_id,
                    followeeLogin: relationship.to_login,
                    followeeDisplayName: relationship.to_name,
                    followedAt: new Date(relationship.followed_at)
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {total, relationships, cursor: cursor!};
                    return relationships.length === 0 ? null : {total, relationships, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return relationships.length === 0 ? null : {total, relationships, cursor: null}
    }

    /**
     * Gets followers of a user
     * @Tokentype user, app
     * @param userId Id of user to get followers of
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of followers to get.
     * @return List of users that are following the user specified by userId. If no one was found, null will be returned.
     */
    public async getFollowers(userId: string, options?:{cursor?: string, max?: number}):Promise<null | { cursor: string | null, total: number, followers: { displayName: string, followedAt: Date, id: string, login: string }[] }>{
        const relationships = await this.getUsersFollows({followeeId: userId}, options);
        return relationships == null ? null : {total: relationships.total, cursor: relationships.cursor, followers: relationships.relationships.map((relationship: FollowRelationship)=>{
            return {
                id: relationship.followerId,
                login: relationship.followerLogin,
                displayName: relationship.followerDisplayName,
                followedAt: relationship.followedAt
            }
        })}
    }

    /**
     * Get all users that the specified user is following
     * @Tokentype user, app
     * @param userId Id of user to get followees of
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of followers to get.
     * @return List of users the specified user is following. If no one was found, null will be returned.
     */
    public async getFollowees(userId: string, options?:{cursor?: string, max?: number}): Promise<null | {cursor: string | null, total: number, followees: {id: string, login: string, displayName: string, followedAt: Date}[]}>{
        const relationships = await this.getUsersFollows({followerId: userId}, options);
        return relationships == null ? null : {total: relationships.total, cursor: relationships.cursor, followees: relationships.relationships.map((relationship: FollowRelationship)=>{
                return {
                    id: relationship.followeeId,
                    login: relationship.followeeLogin,
                    displayName: relationship.followeeDisplayName,
                    followedAt: relationship.followedAt
                }
            })}
    }

    /**
     * Determines whether the user is following the broadcaster
     * @Tokentype user, app
     * @param userId Id of user to check following for
     * @param broadcasterId If of broadcaster to check for
     * @return Boolean that determines whether the user is following the broadcaster
     */
    public async isFollowing(userId: string, broadcasterId: string): Promise<boolean>{
        const result = await this.getUsersFollows({followerId: userId, followeeId: broadcasterId});
        return result !== null;
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-user-block-list
    /**
     * Gets the list of users that the broadcaster has blocked.
     * @Tokentype user
     * @Scope user:read:blocked_users
     * @param broadcasterId The ID of the broadcaster whose list of blocked users you want to get.
     * @param [options] Additional optional parameters
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of blocked users to be returned.
     * @return List of blocked users. If no one was found, null will be returned.
     */
    public async getUserBlockList(broadcasterId: string, options?: {cursor?: string, max?: number}): Promise<null | {blockedUsers: {id: string, login: string, displayName: string}[], cursor: string | null}>{
        const blockedUsers: {id: string, login: string, displayName: string}[] = [];

        let URL = `https://api.twitch.tv/helix/users/blocks?broadcaster_id=${broadcasterId}`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        let total = 0;

        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL.replace("?&", "?"), {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            total = response.data.total;

            cursor = response.data.pagination.cursor;

            for (const user of response.data.data){
                blockedUsers.push({
                    id: user.user_id,
                    login: user.user_login,
                    displayName: user.display_name
                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {blockedUsers, cursor: cursor!};
                    return blockedUsers.length === 0 ? null : {blockedUsers, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return blockedUsers.length === 0 ? null : {blockedUsers, cursor: null}
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#block-user
    /**
     * Blocks the specified user from interacting with or having contact with the broadcaster.
     * @Tokentype user
     * @Scope user:manage:blocked_users
     * @NOTE The user ID in the OAuth token identifies the broadcaster who is blocking the user.
     * @param userId The ID of the user to block.
     * @param options Optional additional blocking parameters
     * @param options.blockContext The location where the harassment took place
     * @param options.reason The reason that the broadcaster is blocking the user
     */
    public async blockUser(userId: string, options?: {blockContext: BlockContext, reason: BlockReason}): Promise<void>{
        let URL = `https://api.twitch.tv/helix/users/blocks?target_user_id=${userId}`

        if(!isUndefined(options)){
            if(!isUndefined(options!.blockContext))
                URL = `${URL}&source_context=${options!.blockContext}`
            if(!isUndefined(options!.reason))
                URL = `${URL}&reason=${options!.reason}`
        }

        await axios.put(URL, {}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#unblock-user
    /**
     * Removes the user from the broadcaster’s list of blocked users.
     * @Tokentype user
     * @Scope user:manage:blocked_users
     * @NOTE The user ID in the OAuth token identifies the broadcaster who’s removing the block.
     * @param userId The ID of the user to remove from the broadcaster’s list of blocked users.
     */
    public async unblockUser(userId: string): Promise<void>{
       await axios.delete(`https://api.twitch.tv/helix/users/blocks?target_user_id=${userId}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }


    //Reference: https://dev.twitch.tv/docs/api/reference#get-user-extensions
    /**
     * Gets a list of all extensions (both active and inactive) that the broadcaster has installed.
     * @Tokentype user
     * @Scope user:read:broadcast or user:edit:broadcast, to include inactive extensions, you must include the user:edit:broadcast scope.
     * @NOTE The user ID in the access token identifies the broadcaster.
     * @return The list of extensions that the user has installed.
     */
    public async getUserExtensions():Promise<Extension[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/users/extensions/list`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : response.data.data.map((extension: any): UserExtension=>{
            return {
                id: extension.id,
                version: extension.version,
                name: extension.name,
                canActivate: extension.can_activate,
                type: extension.type
            }
        })
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#get-user-active-extensions
    /**
     * Gets the active extensions that the broadcaster has installed for each configuration.
     * @Tokentype user, app (see NOTE)
     * @Scope user:read:broadcast or user:edit:broadcast
     * @NOTE This parameter is required if you specify an app access token and is optional if you specify a user access token.
     * @param broadcasterId The ID of the broadcaster whose active extensions you want to get.
     * @return The active extensions that the broadcaster has installed.
     */
    public async getUserActiveExtensions(broadcasterId?: string):Promise<UserExtension2[] | null>{
        const response = await axios.get(`https://api.twitch.tv/helix/users/extensions?${isDefined(broadcasterId) ? `user_id=${broadcasterId}` : ""}`, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken ?? this._tokenHandler.appAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })

        return response.data.data.length === 0 ? null : response.data.data[0];


    }


    //TODO: https://dev.twitch.tv/docs/api/reference#update-user-extensions


    //Reference: https://dev.twitch.tv/docs/api/reference#get-videos
    /**
     * Gets information about one or more published videos. You may get videos by ID, by user, or by game/category.
     * @param videoIds A list of IDs that identify the videos you want to get.
     * @param broadcasterId The ID of the broadcaster whose list of videos you want to get.
     * @param categoryId A category or game ID
     * @param [options] Additional optional parameters
     * @param [options.language] A filter used to filter the list of videos by the language that the video owner broadcasts in.
     * @param [options.period] A filter used to filter the list of videos by when they were published.
     * @param [options.sort] The order to sort the returned videos in. Possible values are
     * @param [options.type] A filter used to filter the list of videos by the video’s type.
     * @param [options.cursor] The cursor used to get the next page of results.
     * @param [options.max] The maximum amount of videos to be returned.
     * @return The list of published videos that match the filter criteria.
     */
    public async getVideos(videoIds: string[], broadcasterId: string, categoryId: string, options?:{language?: Languages, period?: VideoPeriods, sort?: VideoSorting, type?: VideoType, cursor?: string, max?: number}):Promise<{videos: Video[], cursor: string | null} | null>{
        const videos: Video[] = [];

        let URL = `https://api.twitch.tv/helix/videos?user_id=${broadcasterId}&id=${videoIds.join("&id=")}&game_id=${categoryId}`

        if(isDefined(options?.language))
            URL = `${URL}&language=${options!.language}`

        if(isDefined(options?.period))
            URL = `${URL}&period=${options!.period}`

        if(isDefined(options?.sort))
            URL = `${URL}&sort=${options!.sort}`

        let cursor = options?.cursor
        let count = 0;
        let pageSize = 100
        while(true){

            if(isDefined(options?.max) && count + pageSize > options!.max!)
                pageSize = options!.max! - count;

            URL = `${URL}first=${pageSize}`

            if (isDefined(cursor))
                URL = `${URL}after=${cursor}`

            const response = await axios.get(URL, {
                headers: {
                    "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                    "Client-Id": this._tokenHandler.clientId
                }
            })

            cursor = response.data.pagination.cursor;

            for (const video of response.data.data){
                videos.push({
                    id: video.id,
                    streamId: video.stream_id,
                    broadcasterId: video.user_id,
                    broadcasterLogin: video.user_login,
                    broadcasterDisplayName: video.user_name,
                    title: video.title,
                    description: video.description,
                    createdAt: new Date(video.created_at),
                    publishedAt: new Date(video.published_at),
                    url: video.url,
                    thumbnailUrl: video.thumbnail_url,
                    viewable: video.viewable,
                    viewCount: video.view_count,
                    language: video.language,
                    type: video.type,
                    duration: {
                        minutes: parseInt(video.duration.split("m")[0]),
                        seconds: parseInt(video.duration.split("m").split("s")[0])
                    },
                    mutedSegments: video.muted_segments.map((segment: any)=>{
                        return {
                            duration: {
                                minutes: parseInt(segment.duration.split("m")[0]),
                                seconds: parseInt(segment.duration.split("m").split("s")[0])
                            },
                            offset: segment.offset
                        }
                    })


                })
                count++;


                if(isDefined(options?.max) && count === options!.max){
                    if(isDefined(cursor))
                        return {videos: videos, cursor: cursor!};
                    return videos.length === 0 ? null : {videos: videos, cursor: null}
                }
            }

            if(isUndefined(cursor)){
                break;
            }
        }

        return videos.length === 0 ? null : {videos: videos, cursor: null}
    }

    //Reference: https://dev.twitch.tv/docs/api/reference#delete-videos
    /**
     * Deletes one or more videos. You may delete past broadcasts, highlights, or uploads.
     * @Tokentype user
     * @Scope channel:manage:videos
     * @NOTE If the user doesn’t have permission to delete one of the videos in the list, none of the videos are deleted.
     * @param videoIds The list of videos to delete.
     * @return The list of IDs of the videos that were deleted.
     */
    public async deleteVideos(videoIds: string[]):Promise<string[]>{
        const response = await axios.delete(`https://api.twitch.tv/helix/videos?id=${videoIds.join("&id=")}`,  {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
        return response.data.data.length === 0 ? null : response.data.data;

    }


    //Reference: https://dev.twitch.tv/docs/api/reference#send-whisper
    /**
     * Sends a whisper message to the specified user.
     * @Tokentype user
     * @Scope user:manage:whispers
     * @NOTE The senderId must match the user ID in the user access token and the sender must have a verified phone number
     * @NOTE The message may not be empty. 500 chars if you initially start a conversation, 10000 chars if you reply to a message
     * @param senderId The ID of the user sending the whisper.
     * @param receiverId The ID of the user to receive the whisper.
     * @param message The whisper message to send.
     */
    public async sendWhisper(senderId: string, receiverId: string, message: string): Promise<void>{
        await axios.post(`https://api.twitch.tv/helix/whispers?from_user_id${senderId}&to_user_id${receiverId}`, {message}, {
            headers: {
                "Authorization": `Bearer ${this._tokenHandler.userAccessToken}`,
                "Client-Id": this._tokenHandler.clientId
            }
        })
    }
}









export type startCommercialResult = {
    /**
     * The length (seconds) of the commercial you requested. If you request a commercial that’s longer than 180 seconds, the API uses 180 seconds.
     */
    commercialLength: number,
    /**
     * A message that indicates whether Twitch was able to serve an ad.
     */
    twitchMessage: string,
    /**
     * The number of seconds you must wait before running another commercial.
     */
    nextCommercialIn: number
}

export type ExtensionReport = {
    /**
     * An ID that identifies the extension that the report was generated for.
     */
    extensionId: string,
    /**
     * The URL that you use to download the report. The URL is valid for 5 minutes.
     */
    url : string,
    /**
     * The type of report.
     */
    type: string,
    /**
     * The reporting window’s start and end dates, in RFC3339 format.
     */
    range: {
        /**
         * The reporting window’s start date.
         */
        startedAt: Date,
        /**
         * The reporting window’s end date.
         */
        endedAt: Date
    }
}

export type GameReport = {
    /**
     * An ID that identifies the game that the report was generated for.
     */
    gameId: string,
    /**
     * The URL that you use to download the report. The URL is valid for 5 minutes.
     */
    url : string,
    /**
     * The type of report.
     */
    type: string,
    /**
     * The reporting window’s start and end dates, in RFC3339 format.
     */
    range: {
        /**
         * The reporting window’s start date.
         */
        startedAt: Date,
        /**
         * The reporting window’s end date.
         */
        endedAt: Date
    }
}

export type LeaderboardLeaders = {
    /**
     * An ID that identifies a user on the leaderboard.
     */
    userId: string,
    /**
     * The user’s login name.
     */
    userLogin: string,
    /**
     * The user’s display name.
     */
    displayName: string,
    /**
     * The user’s position on the leaderboard.
     */
    rank: number,
    /**
     * The number of Bits the user has cheered.
     */
    score: number,
    /**
     * The reporting window’s start and end dates, in RFC3339 format. The dates are calculated by using the started_at and period query parameters. If you don’t specify the started_at query parameter, the fields contain empty strings.
     */
    date_range: {
        /**
         * The reporting window’s start date.
         */
        started_at: Date,
        /**
         * The reporting window’s end date.
         */
        ended_at: Date
    }
}

export type Cheermote = {
    /**
     * The name portion of the Cheermote string that you use in chat to cheer Bits. The full Cheermote string is the concatenation of {prefix} + {number of Bits}. For example, if the prefix is “Cheer” and you want to cheer 100 Bits, the full Cheermote string is Cheer100. When the Cheermote string is entered in chat, Twitch converts it to the image associated with the Bits tier that was cheered.
     */
    prefix: string,
    /**
     * A list of tier levels that the Cheermote supports. Each tier identifies the range of Bits that you can cheer at that tier level and an image that graphically identifies the tier level.
     */
    tiers: Tier[]
    /**
     * The type of Cheermote.
     */
    type: CheermoteType,
    /**
     * The order that the Cheermotes are shown in the Bits card. The numbers may not be consecutive.
     */
    order: number,
    /**
     * The date and time, when this Cheermote was last updated.
     */
    lastUpdated: Date,
    /**
     * A Boolean value that indicates whether this Cheermote provides a charitable contribution match during charity campaigns.
     */
    isCharitable: boolean,

}

const CHEERMOTE_TYPE = {
    /**
     * A Twitch-defined Cheermote that is shown in the Bits card
     */
    GLOBAL_FIRST_PARTY: "global_first_party",
    /**
     * A Twitch-defined Cheermote that is not shown in the Bits card.
     */
    GLOBAL_THRID_PARTY: "global_third_party",
    /**
     * A broadcaster-defined Cheermote.
     */
    CHANNEL_CUSTOM: "channel_custom",
    /**
     * Do not use; for internal use only.
     */
    DISPLAY_ONLY: "display_only",
    /**
     * A sponsor-defined Cheermote. When used, the sponsor adds additional Bits to the amount that the user cheered. For example, if the user cheered Terminator100, the broadcaster might receive 110 Bits, which includes the sponsor's 10 Bits contribution.
     */
    SPONSORED: "sponsored"

} as const;

/**
 * @constant GLOBAL_FIRST_PARTY: A Twitch-defined Cheermote that is shown in the Bits card
 * @constant GLOBAL_THRID_PARTY: A Twitch-defined Cheermote that is not shown in the Bits card.
 * @constant CHANNEL_CUSTOM: A broadcaster-defined Cheermote.
 * @constant DISPLAY_ONLY: Do not use; for internal use only.
 * @constant SPONSORED: A sponsor-defined Cheermote. When used, the sponsor adds additional Bits to the amount that the user cheered. For example, if the user cheered Terminator100, the broadcaster might receive 110 Bits, which includes the sponsor's 10 Bits contribution.
 */
export type CheermoteType = keyof typeof CHEERMOTE_TYPE;

export const LANGUAGES = {
    GERMAN: "de"
} as const;

export type ObjectValues<T> = T[keyof T];
export type Languages = ObjectValues<typeof LANGUAGES>;

export type Tier = {
    /**
     * The minimum number of Bits that you must cheer at this tier level. The maximum number of Bits that you can cheer at this level is determined by the required minimum Bits of the next tier level minus 1. For example, if min_bits is 1 and min_bits for the next tier is 100, the Bits range for this tier level is 1 through 99. The minimum Bits value of the last tier is the maximum number of Bits you can cheer using this Cheermote. For example, 10000.
     */
    min_bits: number,
    /**
     * The tier level.
     */
    level: TierLevel,
    /**
     * The hex code of the color associated with this tier level.
     */
    color: string,
    /**
     * The animated and static image sets for the Cheermote. The dictionary of images is organized by theme, format, and size.
     */
    images: CheermoteImages,
    /**
     * A Boolean value that determines whether users can cheer at this tier level.
     */
    canCheer: boolean,
    /**
     * A Boolean value that determines whether this tier level is shown in the Bits card. Is true if this tier level is shown in the Bits card.
     */
    showInBitsCard: boolean,
}

const TIER_LEVELS = {
    "1":"1",
    "100":"100",
    "500":"500",
    "1000":"1000",
    "5000":"5000",
    "10000":"10000",
    "100000":"100000"
} as const;
export type TierLevel = keyof typeof TIER_LEVELS;

const BROADCASTER_TYPES = {
    AFFILIATE: "affiliate",
    PARTNER: "partner",
    NORMAL: ""
} as const;
export type BroadcasterTypes = ObjectValues<typeof BROADCASTER_TYPES>;

export const USER_TYPES = {
    ADMIN: "admin",
    GLOBAL_MOD: "global_mod",
    STAFF: "staff",
    NORMAL: ""
} as const;
export type UserTypes = ObjectValues<typeof USER_TYPES>;

export const POLL_STATUS = {
    ACTIVE: "ACTIVE",
    COMPLETED: "COMPLETED",
    TERMINATED: "TERMINATED",
    ARCHIVED: "ARCHIVED",
    MODERATED: "MODERATED",
    INVALID: "INVALID"
} as const;
export type PollStatus = ObjectValues<typeof POLL_STATUS>;

export const NAMED_CHAT_COLORS = {
    BLUE: "blue",
    BLUE_VIOLET: "blue_violet",
    CHOCOLATE: "chocolate",
    CORAL: "coral",
    DODGER_BLUE: "dodger_blue",
    FIREBRICK: "firebrick",
    GOLDEN_ROD: "golden_rod",
    GREEN: "green",
    HOT_PINK: "hot_pink",
    ORANGE_RED: "orange_red",
    RED: "red",
    SEA_GREEN: "sea_green",
    SPRING_GREEN: "spring_green",
    YELLOW_GREEN: "yellow_green"
} as const;
export type NamedChatColors = ObjectValues<typeof NAMED_CHAT_COLORS>;

export const REDEMPTION_CODE_STATUS = {
    ALREADY_CLAIMED: "ALREADY_CLAIMED",
    EXPIRED: "EXPIRED",
    INACTIVE: "INACTIVE",
    INCORRECT_FORMAT: "INCORRECT_FORMAT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    NOT_FOUND: "NOT_FOUND",
    SUCCESSFULLY_REDEEMED: "SUCCESSFULLY_REDEEMED",
    UNUSED: "UNUSED",
    USER_NOT_ELIGIBLE: "USER_NOT_ELIGIBLE"
} as const;
export type RedemptionCodeStatus = ObjectValues<typeof REDEMPTION_CODE_STATUS>;

export const BLOCK_REASONS = {
    HARASSMENT: "harassment",
    SPAM: "spam",
    OTHER: "other",
} as const;
export type BlockReason = ObjectValues<typeof BLOCK_REASONS>;

export const BLOCK_CONTEXTS = {
    CHAT: "chat",
    WHISPER: "whisper"
} as const;
export type BlockContext = ObjectValues<typeof BLOCK_CONTEXTS>;

export const TRANSPORT_METHODS = {
    WEBHOOK: "webhook",
    WEBSOCKET: "websocket"
} as const;
export type TransportMethod = ObjectValues<typeof TRANSPORT_METHODS>;

export const CODE_STATUS = {
    ALREADY_CLAIMED: "ALREADY_CLAIMED",
    EXPIRED: "EXPIRED",
    INACTIVE: "INACTIVE",
    INCORRECT_FORMAT: "INCORRECT_FORMAT",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    NOT_FOUND: "NOT_FOUND",
    UNUSED: "UNUSED",
    USER_NOT_ELIGIBLE: "USER_NOT_ELIGIBLE"
} as const;
export type CodeStatus = ObjectValues<typeof CODE_STATUS>;

export const SUBSCRIPTION_STATUS = {
    ENABLED: "enabled",
    WEBHOOK_CALLBACK_VERIFICATION_PENDING: "webhook_callback_verification_pending",
    WEBHOOK_CALLBACK_VERFICIATION_FAILED: "webhook_callback_verification_failed",
    NOTIFICATION_FAILURES_EXCEEDED: "notification_failures_exceeded",
    AUTHORIZATION_REVOKED: "authorization_revoked",
    MODERATOR_REMOVED: "moderator_removed",
    USER_REMOVED: "user_removed",
    VERSION_REMOVED: "version_removed",
    WEBSOCKET_DISCONNECTED: "websocket_disconnected",
    WEBSOCKET_RECEIVED_INBOUND_TRAFFIC: "websocket_received_inbound_traffic",
    WEBSOCKET_CONNECTION_UNUSED: "websocket_connection_unused",
    WEBSOCKET_INTERNAL_ERROR: "websocket_internal_error",
    WEBSOCKET_NETWORK_TIMEOUT: "websocket_network_timeout",
    WEBSOCKET_NETWORK_ERROR: "websocket_network_error"
} as const;
export type SubscriptionStatus = ObjectValues<typeof SUBSCRIPTION_STATUS>;

export const SUBSCRIPTION_TYPES = {
    CHANNEL_UPDATE: "channel.update",
    CHANNEL_FOLLOW: "channel.follow",
    CHANNEL_SUBSCRIBE: "channel.subscribe",
    CHANNEL_SUBSCRIPTION_END: "channel.subscription.end",
    CHANNEL_SUBSCRIPTION_GIFT: "channel.subscription.gift",
    CHANNEL_SUBSCRIPTION_MESSAGE: "channel.subscription.message",
    CHANNEL_CHEER: "channel.cheer",
    CHANNEL_RAID: "channel.raid",
    CHANNEL_BAN: "channel.ban",
    CHANNEL_UNBAN: "channel.unban",
    CHANNEL_MODERATOR_ADD: "channel.moderator.add",
    CHANNEL_MODERATOR_REMOVE: "channel.moderator.remove",
    CHANNEL_POINTS_CUSTOM_REWARD_ADD:"channel.channel_points_custom_reward.add",
    CHANNEL_POINTS_CUSTOM_REWARD_UPDATE: "channel.channel_points_custom_reward.update",
    CHANNEL_POINTS_CUSTOM_REWARD_REMOVE: "channel.channel_points_custom_reward.remove",
    CHANNEL_POINTS_CUSTOM_REWARD_REDEMPTION_ADD: "channel.channel_points_custom_reward_redemption.add",
    CHANNEL_POINTS_CUSTOM_REWARD_REDEMPTION_UPDATE: "channel.channel_points_custom_reward_redemption.update\t",
    CHANNEL_POLL_BEGIN: "channel.poll.begin",
    CHANNEL_POLL_PROGRESS: "channel.poll.progress",
    CHANNEL_POLL_END: "channel.poll.end",
    CHANNEL_PREDICTION_BEGIN: "channel.prediction.begin",
    CHANNEL_PREDICTION_PROGRESS: "channel.prediction.progress",
    CHANNEL_PREDICTION_LOCK: "channel.prediction.lock",
    CHANNEL_PREDICTION_END: "channel.prediction.end",
    CHARITY_DONATION: "channel.charity_campaign.donate",
    CHARITY_CAMPAIGN_START: "channel.charity_campaign.start",
    CHARITY_CAMPAIGN_PROGRESS: "channel.charity_campaign.progress",
    CHARITY_CAMPAIGN_STOP: "channel.charity_campaign.stop",
    DROP_ENTITLEMENT_GRAND: "drop.entitlement.grant",
    EXTENSION_BITS_TRANSACTION_CREATE: "extension.bits_transaction.create",
    GOAL_BEGIN: "channel.goal.begin",
    GOAL_PROGRESS: "channel.goal.progress",
    GOAL_END: "channel.goal.end",
    HYPE_TRAIN_BEGIN: "channel.hype_train.begin",
    HYPE_TRAIN_PROGRESS: "channel.hype_train.progress",
    HYPE_TRAIN_END: "channel.hype_train.end",
    SHIELD_MODE_BEGIN: "channel.shield_mode.begin",
    SHIELD_MODE_END: "channel.shield_mode.end",
    STREAM_ONLINE: "stream.online",
    STREAM_OFFLINE: "stream.offline",
    USER_AUTHORIZATION_GRANT: "user.authorization.grant",
    USER_AUTHORIZATION_REVOKE: "user.authorization.revoke",
    USER_UPDATE: "user.update"
} as const;
export type SubscriptionType = ObjectValues<typeof SUBSCRIPTION_TYPES>;

export type CheermoteImages = {
    /**
     * Dark theme images
     */
    dark:{
        animated: {
            "1": string,
            "1.5": string,
            "2": string,
            "3": string,
            "4": string
        },
        static: {
            "1": string,
            "1.5": string,
            "2": string,
            "3": string,
            "4": string
        }
    },
    /**
     * Light theme images
     */
    light:{
        animated: {
            "1": string,
            "1.5": string,
            "2": string,
            "3": string,
            "4": string
        },
        static: {
            "1": string,
            "1.5": string,
            "2": string,
            "3": string,
            "4": string
        }
    }
}

export interface ChannelInformation {
    /**
     * An ID that uniquely identifies the streamer/broadcaster.
     */
    streamerId: string,
    /**
     * The streamer’s/broadcaster’s login name.
     */
    streamerLogin: string,
    /**
     * The streamer’s/broadcaster’s display name.
     */
    streamerDisplayName: string,
    /**
     * The broadcaster’s preferred language. The value is an ISO 639-1 two-letter language code (for example, en for English). The value is set to “other” if the language is not a Twitch supported language.
     */
    streamerLanguage: Languages,
    /**
     * The name of the game that the broadcaster is playing or last played. The value is an empty string if the streamer/broadcaster has never played a game.
     */
    gameName: string,
    /**
     * 	An ID that uniquely identifies the game that the broadcaster is playing or last played. The value is an empty string if the streamer/broadcaster has never played a game.
     */
    gameId: string,
    /**
     * The title of the stream that the streamer/broadcaster is currently streaming or last streamed. The value is an empty string if the streamer/broadcaster has never streamed.
     */
    streamTitle: string,
    /**
     * The value of the broadcaster’s stream delay setting, in seconds.
     */
    streamDelay: string

}

export type Editor = {
    /**
     * An ID that uniquely identifies a user with editor permissions.
     */
    id: string,
    /**
     * The editor’s display name.
     */
    displayName: string,
    /**
     * The date and time, when the user became one of the broadcaster’s editors.
     */
    appointedAt: Date
}

export type Reward = {
    /**
     * The ID that uniquely identifies the broadcaster.
     */
    broadcasterId: string,
    /**
     * The broadcaster’s login name.
     */
    broadcasterLogin: string,
    /**
     * The broadcaster’s display name.
     */
    broadcasterDisplayName: string,
    /**
     * The ID that uniquely identifies this custom reward.
     */
    id: string,
    /**
     * The title of the reward.
     */
    title: string,
    /**
     * The prompt shown to the viewer when they redeem the reward if user input is required
     */
    prompt: string,
    /**
     * The cost of the reward in Channel Points.
     */
    cost: number,
    /**
     * A set of custom images for the reward. This field is null if the broadcaster didn’t upload images.
     */
    image: {
        /**
         * The URL to a small version of the image.
         */
        url_1x: string,
        /**
         * The URL to a medium version of the image.
         */
        url_2x: string,
        /**
         * The URL to a large version of the image.
         */
        url_4x: string
    },
    /**
     * A set of default images for the reward.
     */
    defaultImage: {
        /**
         * The URL to a small version of the image.
         */
        url_1x: string,
        /**
         * The URL to a medium version of the image.
         */
        url_2x: string,
        /**
         * The URL to a large version of the image.
         */
        url_4x: string
    },
    /**
     * The background color to use for the reward. The color is in Hex format
     */
    backgroundColor: string,
    /**
     * A Boolean value that determines whether the reward is enabled.
     */
    isEnabled: boolean,
    /**
     * A Boolean value that determines whether the user must enter information when redeeming the reward.
     */
    userInputRequired: boolean,
    /**
     * The settings used to determine whether to apply a maximum to the number of redemptions allowed per live stream.
     */
    maxPerStreamSetting:{
        /**
         * A Boolean value that determines whether the reward applies a limit on the number of redemptions allowed per live stream.
         */
        isEnabled: boolean,
        /**
         * The maximum number of redemptions allowed per live stream.
         */
        maxPerStream: number,
    },
    /**
     * The settings used to determine whether to apply a maximum to the number of redemptions allowed per user per live stream.
     */
    maxPerUserPerStreamSetting:{
        /**
         * A Boolean value that determines whether the reward applies a limit on the number of redemptions allowed per user per live stream.
         */
        isEnabled: boolean,
        /**
         * The maximum number of redemptions allowed per user per live stream.
         */
        maxPerUserPerStream: number
    },
    /**
     * The settings used to determine whether to apply a cooldown period between redemptions and the length of the cooldown.
     */
    globalCooldownSetting:{
        /**
         * A Boolean value that determines whether to apply a cooldown period.
         */
        isEnabled: boolean,
        /**
         * The cooldown period, in seconds.
         */
        globalCooldown: number
    },
    /**
     * A Boolean value that determines whether the reward is currently paused.
     */
    isPaused: boolean,
    /**
     * A Boolean value that determines whether the reward is currently in stock.
     */
    isInStock: boolean,
    /**
     * A Boolean value that determines whether redemptions should be set to FULFILLED status immediately when a reward is redeemed.
     */
    redemptionsSkipRequestQueue: boolean,
    /**
     * The number of redemptions redeemed during the current live stream.
     */
    redemptionsCountCurrentStream: number,
    /**
     * The timestamp of when the cooldown period expires. Is null if the reward isn’t in a cooldown state.
     */
    cooldownExpiresAt: Date


}

export type Redemption = {
    /**
     * The ID that uniquely identifies the broadcaster.
     */
    broadcasterId: string,
    /**
     * The broadcaster’s login name.
     */
    broadcasterLogin: string,
    /**
     * The broadcaster’s display name.
     */
    broadcasterDisplayName: string,
    /**
     * The ID that uniquely identifies this redemption.
     */
    id: string,
    /**
     * The ID that uniquely identifies the user that redeemed the reward.
     */
    redeemerId: string,
    /**
     * The redeemer’s login name.
     */
    redeemerLogin: string,
    /**
     * 	The redeemers’s display name.
     */
    redeemerDisplayName: string,
    /**
     * The text the redeemer entered at the prompt when they redeemed the reward; otherwise, an empty string if user input was not required.
     */
    redeemerInput: string,
    /**
     * The state of the redemption.
     */
    status: "CANCELED" | "FULFILLED" | "UNFULLFILED",
    /**
     * The date and time of when the reward was redeemed
     */
    redeemedAt: Date,
    /**
     * 	The reward that the redeemer redeemed.
     */
    reward: Pick<Reward, "id" | "title" | "prompt" | "cost">
}

export type User = {
    id: string,
    login: string,
    displayName: string,
    broadcasterType?: BroadcasterTypes,
    type?: UserTypes,
    description?: string,
    profileImageURL?: string,
    offlineImageURL?: string,
    viewCount?: number,
    email?: string,
    createdAt?: Date
}

export type Emote = {
    id: string,
    name: string,
    images: {
        url_1x: string,
        url_2x: string,
        url_4x: string
    },
    tier: string,
    type: "bitstier" | "follower" | "subscriptions",
    setId: string,
    format: ("static" | "animated")[],
    scale: ("1.0" | "2.0" | "3.0")[],
    themeMode: ("dark" | "light")[]

}

export type GlobalEmote = Omit<Emote, "tier" | "type" | "setId">;

export type EmoteSet = Omit<Emote, "tier">& {ownerId: string};

export type ChatBadge = {
    setId: string,
    versions: {
       id: string,
       image_url_1x: string,
        image_url_2x: string,
        image_url_4x: string,
    }[]


}

export type ChatSettings = {
    /**
     * The ID of the broadcaster specified in the request
     */
    broadcasterId: string,
    /**
     * A Boolean value that determines whether chat messages must contain only emotes.
     */
    emoteModeActive: boolean,
    /**
     * A Boolean value that determines whether the broadcaster restricts the chat room to followers only.
     */
    followerModeActive: boolean,
    /**
     * The length of time, in minutes, that users must follow the broadcaster before being able to participate in the chat room.
     */
    followerModeDuration: number,
    /**
     * The moderator’s ID. Only included if the request token was issued by a moderator
     */
    moderatorId?: string,
    /**
     * A Boolean value that determines whether the broadcaster adds a short delay before chat messages appear in the chat room. This gives chat moderators and bots a chance to remove them before viewers can see the message.
     */
    moderatorChatDelayActive: boolean,
    /**
     * The amount of time, in seconds, that messages are delayed before appearing in chat.
     */
    moderatorChatDelay: number,
    /**
     * A Boolean value that determines whether the broadcaster limits how often users in the chat room are allowed to send messages.
     */
    slowModeActive: boolean,
    /**
     * The amount of time, in seconds, that users must wait between sending messages.
     */
    slowModeWaitTime: number | null,
    /**
     * A Boolean value that determines whether only users that subscribe to the broadcaster’s channel may talk in the chat room.
     */
    subscriberModeActive: boolean,
    /**
     * A Boolean value that determines whether the broadcaster requires users to post only unique messages in the chat room.
     */
    uniqueChatModeActive: boolean

}

export type ChatColor = {
    userId: string,
    userLogin: string,
    userDisplayName: string,
    color: string
}

export type Clip = {
    id: string,
    url: string,
    embedUrl: string,
    broadcasterId: string,
    broadcasterDisplayName: string,
    creatorId: string,
    creatorDisplayName: string,
    videoId: string,
    categoryId: string,
    language: Languages,
    title: string,
    viewCount: number,
    createdAt: Date,
    thumbnailUrl: string,
    duration: number,
    vodOffset: number
}

export type Marker = {
    id: string,
    createdAt: Date,
    position: number,
    description: string
}

export type Poll = {
    id: string,
    broadcasterId: string,
    broadcasterDisplayName: string,
    broadcasterLogin: string,
    title: string,
    choices: {
        id: string,
        title: string,
        votes: number,
        channelPointsVotes: number,
        bitsVotes: number
    }[],
    bitsVoting: boolean,
    bitsPerVote: number,
    channelPointsVoting: boolean,
    channelPointsPerVote: number,
    status: PollStatus,
    duration: number,
    startedAt: Date,
    endedAt: Date
}

export type CodeRedemption = {
    code: string,
    status: RedemptionCodeStatus

}

export type Category = {
    id: string,
    name: string,
    boxArtUrl: string,
    igdbId?: string
}

export type BanResult = {
    broadcasterId: string,
    moderatorId: string,
    userId: string,
    createdAt: Date,
    endTime: Date
}

export type BlockedTerm = {
    broadcasterId: string,
    moderatorId: string,
    id: string,
    text: string,
    createdAt: Date,
    updatedAt: Date,
    expiresAt: Date
}

export type Subscription = {
    id: string,
    status: SubscriptionStatus,
    type: SubscriptionType,
    version: string,
    condition: any;
    createdAt: Date,
    transport: {
        method: TransportMethod,
        callback?: string,
        sessionId?: string,
        connectedAt?: Date
    },
    cost: number,
    totalSubscriptions?: number,
    totalCost?: number,
    maxTotalCost?: number
}

export type BannedUser = {
    userId: string,
    userLogin: string,
    userDisplayName: string,
    expiresAt: Date | null,
    createdAt: Date,
    reason: string,
    moderatorId: string,
    moderatorLogin: string,
    moderatorDisplayName: string
}

export type Code = {
    code: string,
    status: CodeStatus
}

export type StreamTag = {
    id: string,
    isAuto: boolean,
    localizationNames: Map<string, string>,
    localizationDescription: Map<string, string>
}

export type getChannelTeamResult = {
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    team: Team
}
export type Team = {
    users?: {
        userId: string,
        userLogin: string,
        userDisplayName: string
    }[],
    info: string,
    thumbnailUrl: string,
    name: string,
    displayName: string,
    id: string,
    backgroundImageUrl: string,
    banner: string,
    createdAt: Date,
    updatedAt: Date
}

export const EXTENSION_CONFIGURATION_LOCATIONS = {
    HOSTED: "hosted",
    CUSTOM: "custom",
    NONE: "none"
} as const;
export type ExtensionConfigurationLocation = ObjectValues<typeof EXTENSION_CONFIGURATION_LOCATIONS>;

export const EXTENSION_STATES = {
    APPROVED: "Approved",
    ASSETS_UPLOADED: "AssetsUploaded",
    DELETED: "Deleted",
    DEPRECATED: "Deprecated",
    IN_REVIEW: "InReview",
    IN_TEST: "InTest",
    PENDING_ACTION: "PendingAction",
    REJECTED: "Rejected",
    RELEASED: "Released"
} as const;
export type ExtensionStates = ObjectValues<typeof EXTENSION_STATES>;

export const EXTENSION_SUBSCRIPTIONS_SUPPORT_LEVELS = {
    OPTIONAL: "optional",
    NONE: "none"
} as const;
export type ExtensionSubscriptionsSupportLevel = ObjectValues<typeof EXTENSION_SUBSCRIPTIONS_SUPPORT_LEVELS>;

export const EXTENSION_TYPES = {
    COMPONENT: "component",
    MOBILE: "mobile",
    OVERLAY: "overlay",
    PANEL: "panel"
} as const;
export type ExtensionType = ObjectValues<typeof EXTENSION_TYPES>;


export type UserExtension = {
    id: string,
    version: string,
    name: string,
    canActivate: boolean,
    type: ExtensionType
}

export type Extension = {
    authorName: string,
    bitsEnabled: boolean,
    canInstall: boolean,
    configurationLocation: ExtensionConfigurationLocation,
    description: string,
    eulaTosUrl: string,
    hasChatSupport: boolean,
    iconUrl: string,
    iconUrls: Map<string, string>,
    id: string,
    name: string,
    privacyPolicyUrl: string,
    requestIdentityLink: string,
    screenshotUrls: string[],
    state: ExtensionStates,
    subscriptionsSupportLevel: ExtensionSubscriptionsSupportLevel,
    summary: string,
    supportEmail: string,
    version: string,
    viewerSummary: string,
    views: {
        mobile: { viewerUrl: string}
        panel: { viewerUrl: string, height: number, canLinkExternalContent: boolean},
        videoOverlay: { viewerUrl: string, canLinkExternalContent: boolean},
        component: { viewerUrl: string, aspectRatioX: number, aspectRatioY: number, autoScale: boolean, scalePixels: number, targetHigh: number, canLinkExternalContent: boolean},
        config: { viewerUrl: string, canLinkExternalContent: boolean},
    },
    allowlistedConfigUrls: string[],
    allowlistedPanelUrls: string[],
}

export const GOAL_TYPES = {
    FOLLOWER: "follower",
    SUBSCRIPTION: "subscription",
    SUBSCRIPTION_COUNT: "subscription_count",
    NEW_SUBSCRIPTION: "new_subscription",
    NEW_SUBSCRIPTION_COUNT: "new_subscription_count",
} as const;
export type GoalType = ObjectValues<typeof GOAL_TYPES>;

export type Goal = {
    id: string,
    broadcasterId: string,
    brodcasterLogin: string,
    broadcasterDisplayName: string,
    type: GoalType,
    description: string,
    currentAmount: number,
    targetAmount: number,
    createdAt: Date
}

export type MessageCheck = {
    id: string,
    text: string
}

export type MessageCheckResult = {
    checkId: string,
    isPermitted: boolean
}

export const MESSAGE_MODERATION_ACTION = {
    ALLOW: "ALLOW",
    DENY: "DENY"
} as const;
export type MessageModerationAction = ObjectValues<typeof MESSAGE_MODERATION_ACTION>;

export type AutoModSettings = {
    broadcasterId: string,
    moderatorId: string,
    overallLevel: number,
    disability: number,
    aggression: number,
    sexualitySexOrGender: number,
    misogyny: number,
    bullying: number,
    swearing: number,
    raceEthnicityOrReligion: number,
    sexBasedTerms: number
}

export type ExtensionSecret = {
    formatVersion: number,
    secrets: {
        content: string,
        activeAt: Date,
        expiresAt: Date
    }[]
}

export type BitsProduct = {
    sku: string,
    cost: {
        amount: number,
        type: "bits"
    },
    inDevelopment: boolean,
    displayName: string,
    expiration: Date,
    isBroadcast: boolean
}
export const PREDICTION_OUTCOME_COLORS = {
    BLUE: "BLUE",
    PINK: "PINK"
} as const;
export type PredictionOutcomeColor = ObjectValues<typeof PREDICTION_OUTCOME_COLORS>;

export const PREDICTION_STATUS = {
    ACTIVE: "ACTIVE",
    CANCELED: "CANCELED",
    LOCKED: "LOCKED",
    RESOLVED: "RESOLVED",

} as const;
export type PredictionStatus = ObjectValues<typeof PREDICTION_STATUS>;

export type Prediction = {
    id: string,
    broadcasterId: string,
    broadcasterDisplayName: string,
    broadcasterLogin: string,
    title: string,
    winningOutcomeId: string,
    outcomes: {
       id: string,
       title: string,
       users: number,
       channelPoints: number,
       topPredictors:{
           userId: string,
           userDisplayName: string,
           userLogin: string,
           channelPointsUsed: number,
           channelPointsWon: number
       },
        color: PredictionOutcomeColor,

    }[],
    predictionWindow: number,
    status: PredictionStatus,
    createdAt: Date,
    endedAt: Date,
    lockedAt: Date,
}

export const VIDEO_TYPES = {
    ARCHIVE: "archive",
    HIGHLIGHT: "highlight",
    UPLOAD: "upload"

} as const;
export type VideoType = ObjectValues<typeof VIDEO_TYPES>;

export const VIDEO_SORTINGS = {
    TIME: "time",
    TRENDING: "trending",
    VIEWS: "views"

} as const;
export type VideoSorting = ObjectValues<typeof VIDEO_SORTINGS>;

export const VIDEO_PERIODS = {
    ALL: "all",
    DAY: "day",
    MONTH: "month",
    WEEK: "week"

} as const;
export type VideoPeriods = ObjectValues<typeof VIDEO_PERIODS>;

export type Video = {
    id: string,
    streamId: string,
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    title: string,
    description: string,
    createdAt: Date,
    publishedAt: Date,
    url: string,
    thumbnailUrl: string,
    viewable: string,
    viewCount: number,
    language: Languages,
    type: VideoType,
    duration: {
        minutes: number,
        seconds: number
    },
    mutedSegments:{
        duration: number,
        offset: number
    }
}

export const STREAM_TYPES = {
    LIVE: "live"

} as const;
export type StreamTypes = ObjectValues<typeof STREAM_TYPES>;

export type Stream = {
    id: string,
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    categoryId: string,
    categoryName: string,
    type: StreamTypes,
    title: string,
    viewerCount: number,
    startedAt: Date,
    language: Languages,
    thumbnailUrl: string,
    tagIds: string,
    isMature: boolean
}

export type FollowRelationship = {
    followerId: string,
    followerLogin: string,
    followerDisplayName: string,
    followeeId: string,
    followeeLogin: string,
    followeeDisplayName: string
    followedAt: Date
}


export const PLAYLIST_TRACK_SOURCE_CONTENT_TYPES = {
    PLAYLIST: "PLAYLIST",
    STATION: "STATION"

} as const;
export type PlaylistTrackSourceContentType = ObjectValues<typeof PLAYLIST_TRACK_SOURCE_CONTENT_TYPES>;
export type PlaylistTrack = {
    album:{
        id: string,
        imageUrl: string,
        name: string
    },
    artists: {
        creatorChannelId: string,
        id: string,
        name: string
    }[],
    duration: number,
    id: string,
    isrc: string,
    title: string,
    source?:{
        contentType: "",
        id: string,
        imageUrl: string,
        soundtrackUrl: string,
        spotifyUrl: string,
        title: string
    }
}

export type SoundtrackPlaylist = {
    id: string,
    description: string,
    imageUrl: string,
    title: string
}

export type Channel = {
    broadcasterLanguage: Languages,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    categoryId: string,
    categoryName: string,
    id: string,
    isLive: boolean,
    tagIds: string[],
    thumbnailUrl: string,
    title: string,
    startedAt: Date
}

export const USER_SUBSCRIPTION_TIER = {
    1000: "Tier 1",
    2000: "Tier 2",
    3000: "Tier 3"

} as const;
export type UserSubscriptionTier = ObjectValues<typeof USER_SUBSCRIPTION_TIER>;
export type UserSubscription = {
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    gifterId: string,
    gifterLogin: string,
    gifterDisplayName: string,
    isGift: boolean,
    tier: UserSubscriptionTier
}

export type StreamMarker = {
    creatorId: string,
    creatorLogin: string,
    creatorDisplayName: string,
    videos:{
        id: string,
        markers: {
            id: string,
            createdAt: Date,
            description: string,
            position: number,
            url: string
        }[]
    }[]
}

export type BroadcasterSubscription = UserSubscription & {
    planName: string,
    userId: string,
    userLogin: string,
    userDisplayName: string
}

export const CURRENCIES = {
    EURO: "eur"

} as const;
export type Currency = ObjectValues<typeof CURRENCIES>;

export type CharityCampaign = {
    id: string,
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    name: string,
    description: string,
    logo: string,
    website: string,
    currentAmount: {
        value: number,
        decimalPlaces: number,
        currency: Currency
    },
    targetAmount: {
        value: number,
        decimalPlaces: number,
        currency: Currency
    }

}

export type CharityDonation = {
    campaignId: string,
    donatorId: string,
    donatorLogin: string,
    donatorDisplayName: string,
    amount: {
        value: number,
        decimalPlaces: number,
        currency: Currency
    }
}


export const HYPETRAIN_CONTRIBUTION_TYPES = {
    BITS: "BITS",
    SUBS: "SUBS",
    OTHER: "OTHER"

} as const;
export type HypetrainContributionTypes = ObjectValues<typeof HYPETRAIN_CONTRIBUTION_TYPES>;

export const HYPETRAIN_LEVELS = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5

} as const;
export type HypetrainLevel = ObjectValues<typeof HYPETRAIN_LEVELS>;

export type HypeTrainEvent = {
    id: string,
    type: string,
    timestamp: Date,
    version: string,
    data: {
        broadcasterId: string,
        cooldownEndTime: Date,
        expiresAt: Date,
        goal: number,
        hypetrainId: string,
        lastContribution:{
            total: number,
            type: HypetrainContributionTypes,
            contributorId: string
        },
        level: HypetrainLevel,
        startedAt: Date,
        topContributions:{
            total: number,
            type: HypetrainContributionTypes,
            contributorId: string
        }[],
        total: number
    }
}

export type ShieldModeStatus = {
    isActive: boolean,
    moderatorId: string,
    moderatorLogin: string,
    moderatorDisplayName: string,
    lastActivatedAt: Date
}

export type ExtensionLiveChannel = {
    broadcasterId: string,
    broadcasterDisplayName: string,
    categoryId: string,
    categoryName: string,
    title: string
}

export const EXTENSION_TRANSACTION_PRODUCT_TYPE = {
    BITS_IN_EXTENSION: "BITS_IN_EXTENSION"

} as const;
export type ExtensionTransactionProductType = ObjectValues<typeof EXTENSION_TRANSACTION_PRODUCT_TYPE>;

export const EXTENSION_TRANSACTION_PRODUCT_COST_TYPE = {
    BITS: "BITS"

} as const;
export type ExtensionTransactionProductCostType = ObjectValues<typeof EXTENSION_TRANSACTION_PRODUCT_COST_TYPE>;

export type ExtensionTransaction = {
    id: string,
    timestamp: Date,
    broadcasterId: string,
    broadcasterLogin: string,
    broadcasterDisplayName: string,
    buyerId: string,
    buyerLogin: string,
    buyerDisplayName: string,
    productType: ExtensionTransactionProductType,
    productData:{
        sku: string,
        domain: string,
        cost: {
            amount: number,
            type: ExtensionTransactionProductCostType
        },
        inDevelopment: boolean,
        name: string,
        expiration: string,
        broadcast: boolean
    }
}

export type UserExtension2 = {
    panel: Map<string, {
        active: boolean,
        id: string,
        version: string,
        name:string
    }>,
    overlay: Map<string, {
        active: boolean,
        id: string,
        version: string,
        name:string
    }>,
    component: Map<string,{
        active: boolean,
        id: string,
        version: string,
        name:string,
        x: number,
        y: number
    }>
}


export const ENTITLEMENT_STATUS = {
    CLAIMED: "CLAIMED",
    FULLFILLED: "FULLFILLED"

} as const;
export type EntitlementStatus = ObjectValues<typeof ENTITLEMENT_STATUS>;
export type DropEntitlement = {
    id: string,
    benefitId: string,
    timestamp: Date,
    granteeId: string,
    categoryId: string,
    fulfillmentStatus: EntitlementStatus,
    lastUpdated: Date
}

export type ScheduleSegment = {
    id: string,
    startTime: Date,
    endTime: Date,
    title: string,
    canceledUntil: string,
    category: {
        id: string,
        name: string
    },
    isRecurring: boolean

}


export type ChatSettingsModifications = {
    emoteModeActive: boolean,
    followerModeActive: boolean,
    followerModeDuration: number,
    moderatorChatDelayActive: boolean,
    moderatorChatDelay: number,
    slowModeActive: boolean,
    slowModeWaitTime: number,
    subscriberModeActive: boolean,
    uniqueChatModeActive: boolean
}

export type RewardModifications = {
    title?: string,
    prompt?: string,
    cost?: number,
    backgroundColor?: string,
    isEnabled?: boolean,
    isUserInputRequired?: boolean,
    isMaxPerStreamEnabled?: boolean,
    maxPerStream?: number,
    isMaxPerUserPerStreamEnabled?: boolean,
    maxPerUserPerStream?: number,
    isCooldownEnabled?: boolean,
    cooldownSeconds?: number,
    isPaused?: boolean,
    redemptionsSkipRequestQueue: boolean
}

export const REDEMPTION_STATUS = {
    CANCELED: "CANCELED",
    FULLFILLED: "FULLFILLED"

} as const;
export type RedemptionStatus = ObjectValues<typeof REDEMPTION_STATUS>;


export type PubsubMessageTarget = "broadcast" | "global" | string;

