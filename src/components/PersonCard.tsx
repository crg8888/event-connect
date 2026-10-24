"use client";

export type Person = {
  id: number;
  name: string;
  headline: string | null;
  description: string | null;
  luma_bio: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  claimed: boolean;
  looking_for: string | null;
};

export default function PersonCard({
  person,
  saved,
  onToggleSave,
}: {
  person: Person;
  saved: boolean;
  onToggleSave?: (p: Person) => void;
}) {
  const about = person.description ?? person.luma_bio;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex gap-3">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.avatar_url}
          alt={person.name}
          className="w-12 h-12 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
          {person.name[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="font-semibold">{person.name}</span>
            {person.claimed && (
              <span className="ml-2 text-[10px] uppercase tracking-wide bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full">
                here
              </span>
            )}
          </div>
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(person)}
              className={`text-lg leading-none ${saved ? "" : "grayscale opacity-40"}`}
              aria-label={saved ? "Unsave" : "Save"}
            >
              📌
            </button>
          )}
        </div>
        {person.headline && (
          <p className="text-sm text-zinc-400 mt-0.5">{person.headline}</p>
        )}
        {about && (
          <p className="text-xs text-zinc-500 mt-1.5 line-clamp-3">{about}</p>
        )}
        {person.looking_for && (
          <p className="text-xs text-emerald-400/90 mt-1.5">
            Looking for: {person.looking_for}
          </p>
        )}
        {person.linkedin_url && (
          <a
            href={person.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-xs text-sky-400 mt-2"
          >
            LinkedIn ↗
          </a>
        )}
      </div>
    </div>
  );
}
