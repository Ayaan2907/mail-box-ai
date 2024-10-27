"use client";
import React from "react";
import { Button } from "./ui/button";
import { getAurinkoUrl } from "@/lib/aurinko";

const AccountLinkBtn = () => {
  return (
    <Button
      onClick={async () => {
        const authUrl = await getAurinkoUrl("Office365");
        // window.alert(authUrl);
        window.location.href = authUrl;
      }}
    >
      Link Your Account
    </Button>
  );
};

export default AccountLinkBtn;
