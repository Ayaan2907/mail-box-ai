import pLimit from "p-limit";
import {
  EmailInboxType,
  SyncUpdatedResponse,
  EmailMessage,
  EmailAddress,
  EmailAttachment,
  EmailHeader,
} from "@/lib/types";
import { db } from "@/server/db";

export async function syncEmailsToDatabase(
  emails: EmailMessage[],
  accountId: string,
) {
  console.log(`Syncing ${emails.length} emails to database`);
  const limit = pLimit(10);
  try {
    await Promise.all(
      emails.map((email) => limit(() => AppendEmailsToDB(email, accountId))),
    );

    // for (const email of emails) {
    //     await AppendEmailsToDB(email, accountId);
    // }
  } catch (error) {
    console.log("error", error);
  }
}

/**
 * Appends an email to the database, including its addresses, thread, and attachments.
 * 
 * @param email - The email message to append.
 * @param accountId - The account ID associated with the email.
 * 
 * @remarks
 * This function performs the following steps:
 * 1. Determines the email label type based on system labels.
 * 2. Upserts email addresses (from, to, cc, bcc, replyTo) into the database.
 * 3. Upserts the email thread into the database.
 * 4. Upserts the email itself into the database.
 * 5. Updates the thread's status based on the emails it contains.
 * 6. Upserts email attachments into the database.
 * 
 * @throws Will log an error if any step fails.
 */
async function AppendEmailsToDB(email: EmailMessage, accountId: string) {
    try {
        // Determine the email label type based on system labels
        let emailLabelType: EmailInboxType = EmailInboxType.inbox;
        if (
            email.sysLabels.includes(EmailInboxType.inbox) ||
            email.sysLabels.includes(EmailInboxType.important)
        ) {
            emailLabelType = EmailInboxType.inbox;
        } else if (email.sysLabels.includes(EmailInboxType.sent)) {
            emailLabelType = EmailInboxType.sent;
        } else if (email.sysLabels.includes(EmailInboxType.draft)) {
            emailLabelType = EmailInboxType.draft;
        }

        // Collect unique email addresses to upsert
        const addressesToUpsert = new Map();
        for (const address of [
            email.from,
            ...email.to,
            ...email.cc,
            ...email.bcc,
            ...email.replyTo,
        ]) {
            addressesToUpsert.set(address.address, address);
        }

        // Upsert email addresses into the database
        const upsertedAddresses: (Awaited<
            ReturnType<typeof upsertAddresses>
        > | null)[] = [];

        for (const address of addressesToUpsert.values()) {
            const upsertedAddress = await upsertAddresses(address, accountId);
            upsertedAddresses.push(upsertedAddress);
        }

        // Map upserted addresses for easy access
        const addressMap = new Map(
            upsertedAddresses
                .filter(Boolean)
                .map((address) => [address!.address, address]),
        );

        // Get the 'from' address from the map
        const fromAddress = addressMap.get(email.from.address);
        if (!fromAddress) {
            console.log(
                `Failed to upsert from address for email ${email.id}: ${email.from.address}`,
            );
            return;
        }

        // Get 'to', 'cc', 'bcc', and 'replyTo' addresses from the map
        const toAddresses = email.to
            .map((addr) => addressMap.get(addr.address))
            .filter(Boolean);
        const ccAddresses = email.cc
            .map((addr) => addressMap.get(addr.address))
            .filter(Boolean);
        const bccAddresses = email.bcc
            .map((addr) => addressMap.get(addr.address))
            .filter(Boolean);
        const replyToAddresses = email.replyTo
            .map((addr) => addressMap.get(addr.address))
            .filter(Boolean);

        // Upsert the email thread into the database
        const thread = await db.thread.upsert({
            where: { id: email.threadId },
            update: {
                subject: email.subject,
                accountId,
                lastMessageDate: new Date(email.sentAt),
                done: false,
                participantIds: [
                    ...new Set([
                        fromAddress.id,
                        ...toAddresses.map((a) => a!.id),
                        ...ccAddresses.map((a) => a!.id),
                        ...bccAddresses.map((a) => a!.id),
                    ]),
                ],
            },
            create: {
                id: email.threadId,
                accountId,
                subject: email.subject,
                done: false,
                draftStatus: emailLabelType === EmailInboxType.draft,
                inboxStatus: emailLabelType === EmailInboxType.inbox,
                sentStatus: emailLabelType === EmailInboxType.sent,
                lastMessageDate: new Date(email.sentAt),
                participantIds: [
                    ...new Set([
                        fromAddress.id,
                        ...toAddresses.map((a) => a!.id),
                        ...ccAddresses.map((a) => a!.id),
                        ...bccAddresses.map((a) => a!.id),
                    ]),
                ],
            },
        });

        // Upsert the email itself into the database
        await db.email.upsert({
            where: { id: email.id },
            update: {
                threadId: thread.id,
                createdTime: new Date(email.createdTime),
                lastModifiedTime: new Date(),
                sentAt: new Date(email.sentAt),
                receivedAt: new Date(email.receivedAt),
                internetMessageId: email.internetMessageId,
                subject: email.subject,
                sysLabels: email.sysLabels,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { set: toAddresses.map((a) => ({ id: a!.id })) },
                cc: { set: ccAddresses.map((a) => ({ id: a!.id })) },
                bcc: { set: bccAddresses.map((a) => ({ id: a!.id })) },
                replyTo: { set: replyToAddresses.map((a) => ({ id: a!.id })) },
                hasAttachments: email.hasAttachments,
                internetHeaders: email.internetHeaders as any,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties as any,
                folderId: email.folderId,
                omitted: email.omitted,
                emailLabel: emailLabelType,
            },
            create: {
                id: email.id,
                emailLabel: emailLabelType,
                threadId: thread.id,
                createdTime: new Date(email.createdTime),
                lastModifiedTime: new Date(),
                sentAt: new Date(email.sentAt),
                receivedAt: new Date(email.receivedAt),
                internetMessageId: email.internetMessageId,
                subject: email.subject,
                sysLabels: email.sysLabels,
                internetHeaders: email.internetHeaders as any,
                keywords: email.keywords,
                sysClassifications: email.sysClassifications,
                sensitivity: email.sensitivity,
                meetingMessageMethod: email.meetingMessageMethod,
                fromId: fromAddress.id,
                to: { connect: toAddresses.map((a) => ({ id: a!.id })) },
                cc: { connect: ccAddresses.map((a) => ({ id: a!.id })) },
                bcc: { connect: bccAddresses.map((a) => ({ id: a!.id })) },
                replyTo: { connect: replyToAddresses.map((a) => ({ id: a!.id })) },
                hasAttachments: email.hasAttachments,
                body: email.body,
                bodySnippet: email.bodySnippet,
                inReplyTo: email.inReplyTo,
                references: email.references,
                threadIndex: email.threadIndex,
                nativeProperties: email.nativeProperties as any,
                folderId: email.folderId,
                omitted: email.omitted,
            },
        });

        // Retrieve all emails in the thread to update the thread's status
        const threadEmails = await db.email.findMany({
            where: { threadId: thread.id },
            orderBy: { receivedAt: "asc" },
        });

        // Determine the thread's folder type based on its emails
        let threadFolderType = EmailInboxType.sent;
        for (const threadEmail of threadEmails) {
            if (threadEmail.emailLabel === EmailInboxType.inbox) {
                threadFolderType = EmailInboxType.inbox;
                break; // If any email is in inbox, the whole thread is in inbox
            } else if (threadEmail.emailLabel === EmailInboxType.draft) {
                threadFolderType = EmailInboxType.draft; // Set to draft, but continue checking for inbox
            }
        }

        // Update the thread's status in the database
        await db.thread.update({
            where: { id: thread.id },
            data: {
                draftStatus: threadFolderType === EmailInboxType.draft,
                inboxStatus: threadFolderType === EmailInboxType.inbox,
                sentStatus: threadFolderType === EmailInboxType.sent,
            },
        });

        // Upsert email attachments into the database
        for (const attachment of email.attachments) {
            await upsertAttachment(email.id, attachment);
        }
    } catch (error) {
        console.log("error", error);
    }
}

async function upsertAddresses(address: EmailAddress, accountId: string) {
  try {
    return await db.emailAddress.upsert({
      where: {
        accountId_address: {
          accountId,
          address: address.address ?? "",
        },
      },
      create: {
        address: address.address ?? "",
        name: address.name,
        raw: address.raw,
        accountId,
      },
      update: {
        name: address.name,
        raw: address.raw,
      },
    });
  } catch (error) {
    console.log(`Failed to append email address: ${error}`);
    return null;
  }
}

async function upsertAttachment(emailId: string, attachment: EmailAttachment) {
  try {
    await db.emailAttachment.upsert({
      where: { id: attachment.id ?? "" },
      update: {
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        inline: attachment.inline,
        contentId: attachment.contentId,
        content: attachment.content,
        contentLocation: attachment.contentLocation,
      },
      create: {
        id: attachment.id,
        emailId,
        name: attachment.name,
        mimeType: attachment.mimeType,
        size: attachment.size,
        inline: attachment.inline,
        contentId: attachment.contentId,
        content: attachment.content,
        contentLocation: attachment.contentLocation,
      },
    });
  } catch (error) {
    console.log(`Failed to append attachment for email ${emailId}: ${error}`);
  }
}
