import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/server/db';
import Account from '@/lib/accounts';
import {syncEmailsToDatabase} from '@/lib/sync-to-db';

export const POST = async (req: NextRequest) => {
    try {
        const { accountId, userId } = await req.json();
        if (!accountId || !userId) {
            return NextResponse.json({ error: "Missing Account Id or User Id" }, { status: 400 });
        }

        const dbAccount = await db.emailAccount.findUnique({
            where: {
                id: accountId.toString(),
                user_id: userId,
            },
        });
        if (!dbAccount) {
            return NextResponse.json({ error: "Account not found" }, { status: 404 });
        }

        const account = new Account(dbAccount.access_token);
        const response = await account.performInitialSync();
        if (!response) {
            return NextResponse.json({ error: "Failed to sync" }, { status: 500 });
        }
        const { emails, deltaToken } = response;
        await syncEmailsToDatabase(emails, accountId);
        console.log(`Synced emails to database`);

        await db.emailAccount.update({
            where: {
                id: accountId.toString(),
            },
            data: {
                nextDeltaToken: response.deltaToken || "",
            },
        });

        return NextResponse.json({ success: true, deltaToken: response.deltaToken }, { status: 200 });
    } catch (e: any) {
        console.error("Initial mail sync error", e);
        return NextResponse.json({ error: `Error: ${e.message}` }, { status: 500 });
    }
};
