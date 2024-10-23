import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";

//  FIXME: incomplete code, email not getting from clerk
interface ClerkUserData {
    id: string;
    created_at: string;
    email_addresses: { email_address: string; [key: string]: any }[] | [];
    first_name: string;
    last_name: string;
    image_url: string;
    updated_at: string;
}
type UserInDb = Omit<
    ClerkUserData,
    "email_addresses" | "first_name" | "last_name"
> & {
    email: string;
    name: string;
};

export const POST = async (req: Request) => {
    try {
        const UserData: ClerkUserData = await req.json();
        // const user: UserInDb = {
        //   id: UserData.id,
        //   name: `${UserData.first_name} ${UserData.last_name}`,
        //   email: UserData.email_addresses[0]?.email_address || "", //giving error on server
        //   image_url: UserData.image_url,
        //   created_at: UserData.created_at,
        //   updated_at: UserData.updated_at,
        // };
        console.log(UserData);

        // await db.user.create({
        //   data: { ...user, recorded_at: new Date() },
        // });

        return new Response("User Created", { status: 200 });
    } catch (e: any) {
        console.error(e);
        return new Response(`Error: ${e.message}`, { status: 500 });
    }
};
