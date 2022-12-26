import {ObjectValues} from "./twitch-ts";

export class Exception extends Error{

    private readonly _reason: ExceptionReason;

    constructor(reason: ExceptionReason, msg: string ) {
        super(`${reason} - ${msg}`);
        this._reason = reason;
    }

    get reason(): ExceptionReason{
        return this._reason;
    }
}




export const EXCEPTION_REASONS = {
    UNAUTHORIZED: "Unauthorized",

} as const;
export type ExceptionReason = ObjectValues<typeof EXCEPTION_REASONS>;