import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { getAurinkoAuthToken, getUserAccountDetails } from "@/lib/aurinko";

export const GET = async (req: NextRequest) => {
  try {
    const { userId } = auth();
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
    return accountDetails 
      ? new Response("Mail Connected", { status: 200 })
      : new Response("Unable to get account details", { status: 400 });

  } catch (error) {
    console.error("Error In handeling request", error);
    return new Response("Error In handeling request", { status: 500 });
  }
};
