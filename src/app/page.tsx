import { api, HydrateClient } from "@/trpc/server";
import AccountLinkBtn from "@/components/accountLinkBtn";
export default async function Home() {
  const hello = await api.post.hello({ text: "from tRPC" });
  // void api.post.getLatest.prefetch();

  return (
    <HydrateClient>
      <div> hello {hello.greeting}</div>
      <AccountLinkBtn />
    </HydrateClient>
  );
}
