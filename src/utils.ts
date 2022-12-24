export function isUndefined(...variables: unknown[]): boolean{
    for(const variable of variables){
        if(variable !== void 0)
            return false;
    }

    return true;
}

export function isDefined(...variables: (unknown | undefined)[]): boolean{
    for(const variable of variables){
        if(variable === void 0)
            return false;
    }

    return true;
}
