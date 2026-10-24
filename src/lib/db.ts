import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __sql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  globalThis.__sql ??
  postgres(process.env.DATABASE_URL!, {
    ssl: "require",
    prepare: false,
    max: 3,
  });

globalThis.__sql = sql;

export type Attendee = {
  id: number;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  linkedin_url: string | null;
  headline: string | null;
  description: string | null;
  luma_bio: string | null;
  twitter: string | null;
  website: string | null;
  avatar_url: string | null;
  claimed: boolean;
  looking_for: string | null;
};
