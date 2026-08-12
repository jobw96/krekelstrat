import { supabase } from "@/integrations/supabase/client";

export type ShareStatus = "pending" | "accepted" | "declined";

export type JournalShare = {
  id: string;
  owner_id: string;
  owner_email: string | null;
  shared_with_email: string;
  shared_with_user_id: string | null;
  status: ShareStatus;
  hide_dollar_amounts: boolean;
  created_at: string;
};

/** Link pending invites addressed to my email to my account. */
export async function claimShares(): Promise<void> {
  await supabase.rpc("claim_journal_shares" as never);
}

export async function fetchShares(): Promise<JournalShare[]> {
  const { data, error } = await supabase
    .from("journal_shares")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as JournalShare[];
}

export async function inviteBuddy(opts: {
  ownerId: string;
  ownerEmail: string | null;
  email: string;
  hideDollarAmounts: boolean;
}): Promise<void> {
  const { error } = await supabase.from("journal_shares").insert({
    owner_id: opts.ownerId,
    owner_email: opts.ownerEmail,
    shared_with_email: opts.email.trim().toLowerCase(),
    hide_dollar_amounts: opts.hideDollarAmounts,
  } as never);
  if (error) throw error;
}

export async function revokeShare(id: string): Promise<void> {
  const { error } = await supabase.from("journal_shares").delete().eq("id", id);
  if (error) throw error;
}

export async function setShareStatus(id: string, status: ShareStatus): Promise<void> {
  const { error } = await supabase
    .from("journal_shares")
    .update({ status } as never)
    .eq("id", id);
  if (error) throw error;
}

export async function setShareMasking(id: string, hide: boolean): Promise<void> {
  const { error } = await supabase
    .from("journal_shares")
    .update({ hide_dollar_amounts: hide } as never)
    .eq("id", id);
  if (error) throw error;
}

/** Label for a buddy journal entry in the switcher. */
export function buddyLabel(share: JournalShare): string {
  const name = (share.owner_email ?? "Buddy").split("@")[0] ?? "Buddy";
  return `${name}'s Journal`;
}
