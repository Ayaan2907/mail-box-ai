"use server";

import { auth } from "@clerk/nextjs/server";
import axios from "axios";
import { headers } from "next/headers";
import { AurinkoServiceType, AurinkoAuthTokenResponseType } from "@/types/aurinko";

const AURINKO_API_URL = "https://api.aurinko.io/v1";
export const getAurinkoUrl = async (serviceType: AurinkoServiceType) => {
  
  const { userId } = auth();
  if (!userId) {
    throw new Error("User not authenticated");
  }
  //  this is the url to redirect to Aurinko
  const urlParams = new URLSearchParams({
    clientId: `${process.env.AURINKO_CLIENT_ID}` as string,
    serviceType,
    scopes: "Mail.Read Mail.ReadWrite Mail.Send Mail.Drafts Mail.All",
    returnUrl: `${process.env.NEXT_PUBLIC_PROXY_URL_LOCAL}/api/aurinko/callback`,
    responseType: "code",
  });
  return `${AURINKO_API_URL}/auth/authorize?${urlParams.toString()}`;
};

export const getAurinkoAuthToken = async (code: string) => {
  try {
    const res = await axios.post(
      `${AURINKO_API_URL}/auth/token/${code}`,
      {},
      {
        auth: {
          username: `${process.env.AURINKO_CLIENT_ID}`,
          password: `${process.env.AURINKO_CLIENT_SECRET}`,
        },
      },
    );
    return res.data as AurinkoAuthTokenResponseType;
  } catch (e) {
    console.log("error in getting aurinko auth token", e);
  }
};

export const getUserAccountDetails = async (authToken: string) => {
    try {
        
        const res = await axios.get(`${AURINKO_API_URL}/account`, {
            headers: {
                "Authorization" : `Bearer ${authToken}`
            }
        })
        return res.data as {
            email: string,
            name : string,
        }
    } catch (e) {
        console.log("error in getting account details", e)
    }
}
