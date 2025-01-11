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

    const accountDetails = await getUserAccountDetails(
      authTokenResponse.accessToken,
    );
    if (!accountDetails) {
      return new Response("Unable to get account details", { status: 400 });
    }
    /**
     * aurinko is not providing unique ids for an email
     * if same email id added twice, a new id is generated
     * so doing upsert not working, thats why first chicking if mail exist then creating new
     */

    const existingAccount = await db.emailAccount.findUnique({
      where: {
        email: accountDetails.email,
      },
    });

    if (existingAccount) {
      await db.emailAccount.update({
        where: {
          email: accountDetails.email,
        },
        data: {
          access_token: authTokenResponse.accessToken,
        },
      });
    } else {
      await db.emailAccount.create({
        data: {
          id: authTokenResponse.accountId.toString(),
          user_id: userId,
          email: accountDetails.email,
          access_token: authTokenResponse.accessToken,
          name: accountDetails.name,
        },
      });
    }

    return new Response("Account Connected", { status: 200 });
  } catch (error) {
    return new Response("Error In handeling request", { status: 500 });
  }
};
