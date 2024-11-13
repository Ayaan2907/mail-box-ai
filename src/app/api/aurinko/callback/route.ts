import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { getAurinkoAuthToken, getUserAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";

export const GET = async (req: NextRequest) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const status = searchParams.get("status");

    if (!code || status !== "success") {
      return new Response("Unable to Connect, Retry later", { status: 400 });
    }

    const authTokenResponse = await getAurinkoAuthToken(code);
    if (!authTokenResponse) {
      return new Response("Unable to get access token", { status: 400 });
    }

    const accountDetails = await getUserAccountDetails(authTokenResponse.accessToken);
    if (!accountDetails) {
      return new Response("Unable to get account details", { status: 400 });
    }
    
    await db.emailAccount.upsert({
      where: {
        id: authTokenResponse.accountId.toString(),
      },
      update: {
        access_token: authTokenResponse.accessToken,
      },
      create: {
        id: authTokenResponse.accountId.toString(),
        user_id: userId,
        email: accountDetails.email,
        access_token: authTokenResponse.accessToken,
        name: accountDetails.name,
      },
    });
    console.log("Updated record in the database with account ID:", authTokenResponse);
    return  new Response("Mail Connected", { status: 200 })

  } catch (error) {
    console.error("Error In handeling request", error);
    return new Response("Error In handeling request", { status: 500 });
  }
};
