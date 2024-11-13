
export enum AurinkoServiceType {
    Google = 'Google',
    Office365 = 'Office365'
}


export interface AurinkoAuthTokenResponseType {
    accountId: number;
    accessToken: string;
    userId: string;
    userSession: string;
}
