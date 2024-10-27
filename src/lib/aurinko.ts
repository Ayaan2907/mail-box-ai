"use server"

import { auth } from "@clerk/nextjs/server"

export const getAurinkoUrl = async (serviceType: "Google" | "Office365") => {
    const AURINKO_API_URL = "https://api.aurinko.io/v1"

    const { userId } = await auth()
    if (!userId) {
        throw new Error("User not authenticated")
    }
    //  this is the url to redirect to Aurinko
    const urlParams = new URLSearchParams({
        clientId: `${process.env.AURINKO_CLIENT_ID}` as string,
        serviceType,
        scopes: 'Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All',
        returnUrl: `${process.env.NEXT_PUBLIC_PROXY_URL_LOCAL}/api/aurinko/callback`,
        responseType: 'code',
    })
    console.log(urlParams)      
    
    return `${AURINKO_API_URL}/auth/authorize?${urlParams.toString()}`

}