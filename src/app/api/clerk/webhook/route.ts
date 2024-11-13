import { db } from "@/server/db";

//  FIXME: incomplete code, email not getting from clerk
// interface ClerkUserData {
//   id: string;
//   created_at: string;
//   email_addresses: { email_address: string; [key: string]: any }[] | [];
//   first_name: string;
//   last_name: string;
//   image_url: string;
//   updated_at: string;
// }
// type UserInDb = Omit<
//   ClerkUserData,
//   "email_addresses" | "first_name" | "last_name"
// > & {
//   email: string;
//   name: string;
// };

export const POST = async (req: Request) => {
  try {
    const clerkUser= await req.json();
    const user = {
      id: clerkUser.data.id,
      name: `${clerkUser.data.first_name} ${clerkUser.data.last_name}`,
      email: clerkUser.data.email_addresses[0].email_address, 
      image_url: clerkUser.data.image_url,
      created_at: clerkUser.data.created_at.toString(), //temp fix
      updated_at: clerkUser.data.updated_at.toString(),
    };

    await db.user.create({
      data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image_url: user.image_url,
      created_at: user.created_at, //temp fix
      updated_at: user.updated_at,
      },
    });

    return new Response("User Created", { status: 200 });
  } catch (e: any) {
    console.error("Error in user creation", e);
    return new Response(`Error: ${e.message}`, { status: 500 });
  }
};
