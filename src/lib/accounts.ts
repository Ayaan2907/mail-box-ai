import type {
  EmailHeader,
  EmailMessage,
  SyncResponse,
  SyncUpdatedResponse,
} from "@/lib/types";
import { db } from "@/server/db";
import axios from "axios";

class Account {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async startSync(daysWithin: number): Promise<SyncResponse> {
    const response = await axios.post<SyncResponse>(
      `${process.env.AURINKO_PUBLIC_URL}/email/sync`,
      {},
      {
        headers: { Authorization: `Bearer ${this.token}` },
        params: {
          daysWithin: daysWithin,
          bodyType: "html",
        },
      },
    );
    return response.data;
  }

  async getUpdatedEmails({
    deltaToken,
    pageToken,
  }: {
    deltaToken?: string;
    pageToken?: string;
  }) {
    let params: Record<string, string> = {};
    if (deltaToken) params.deltaToken = deltaToken;
    if (pageToken) params.pageToken = pageToken;

    const response = await axios.get(
      `${process.env.AURINKO_PUBLIC_URL}/email/sync/updated`,
      {
        headers: { Authorization: `Bearer ${this.token}` },
        params,
      },
    );
    return response.data;
  }

  async performInitialSync() {
    try {
      let syncResponse = await this.startSync(3);

      // Wait until the sync is ready
      while (!syncResponse.ready) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        syncResponse = await this.startSync(3);
      }

      let storedDeltaToken: string = syncResponse.syncUpdatedToken;
      let updatedResponse = await this.getUpdatedEmails({
        deltaToken: storedDeltaToken,
      });

      if (updatedResponse.nextDeltaToken)
        storedDeltaToken = updatedResponse.nextDeltaToken;

      let allEmails: EmailMessage[] = updatedResponse.records;

      // Fetch all pages if there are more, bcz it syncs in batches
      while (updatedResponse.nextPageToken) {
        updatedResponse = await this.getUpdatedEmails({
          pageToken: updatedResponse.nextPageToken,
        });
        allEmails = allEmails.concat(updatedResponse.records);

        if (updatedResponse.nextDeltaToken) {
          storedDeltaToken = updatedResponse.nextDeltaToken;
        }
      }

      console.log("Initial sync complete. Total emails:", allEmails.length);

      await this.getUpdatedEmails({ deltaToken: storedDeltaToken });

      return {
        emails: allEmails,
        deltaToken: storedDeltaToken,
      };
    } catch (e) {
      console.error("initial mail sync error", e);
    }
  }
}

export default Account;
