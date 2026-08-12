import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
};

/** Turn a stored avatar storage path into a temporary viewable URL. */
async function signAvatar(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

export function profileQueryKey(userId: string | undefined) {
  return ["profile", userId ?? "anon"] as const;
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: profileQueryKey(userId),
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      const profile = (data as Profile | null) ?? null;
      return {
        profile,
        avatarUrl: await signAvatar(profile?.avatar_url ?? null),
      };
    },
  });
}

export function useInvalidateProfile() {
  const qc = useQueryClient();
  return (userId: string | undefined) =>
    qc.invalidateQueries({ queryKey: profileQueryKey(userId) });
}

export async function saveProfile(
  userId: string,
  values: { display_name: string | null; avatar_url?: string | null },
) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...values }, { onConflict: "id" });
  if (error) throw error;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}
