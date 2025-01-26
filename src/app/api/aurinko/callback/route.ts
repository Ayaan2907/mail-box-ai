import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getAurinkoAuthToken, getUserAccountDetails } from "@/lib/aurinko";
import { db } from "@/server/db";
import { waitUntil } from "@vercel/functions";
import axios from "axios";

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

    const accountData = {
      email: accountDetails.email,
      access_token: authTokenResponse.accessToken,
      name: accountDetails.name,
      user_id: userId,
      id: authTokenResponse.accountId.toString(),
    };

    await db.emailAccount.upsert({
      where: { id: authTokenResponse.accountId.toString() },
      create: accountData,
      update: {
        access_token: authTokenResponse.accessToken,
      },
    });

    waitUntil(
      axios.post(`${process.env.NEXT_PUBLIC_PROXY_URL_LOCAL}/api/initial-mail-sync`, {
        accountId: authTokenResponse.accountId.toString(),
        userId,
      })
      .then((res) => console.log("response from aurinko", res.data))
      .catch((e) => console.log("error in aurinko", e)),
    );

    return NextResponse.redirect(new URL(`${process.env.NEXT_PUBLIC_PROXY_URL_LOCAL}/mail`));
  } catch (error) {
    return new Response("Error In handling request", { status: 500 });
  }
};
