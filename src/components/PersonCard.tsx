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
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex gap-3">
      {person.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={person.avatar_url}
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
        />
      ) : (
        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-zinc-400 shrink-0 mt-0.5">
          {person.name[0]}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{person.name}</span>
            {person.claimed && (
              <span className="w-1.5 h-1.5 rounded-full bg-lime-300 shrink-0" title="Active now" />
            )}
          </div>
          {onToggleSave && (
            <button
              onClick={() => onToggleSave(person)}
              aria-label={saved ? "Remove from shortlist" : "Shortlist"}
              className={saved ? "text-lime-300" : "text-zinc-700 hover:text-zinc-500"}
            >
              <svg viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="w-4.5 h-4.5 w-[18px] h-[18px]">
                <path d="M6.5 4h11v16l-5.5-3.5L6.5 20V4z" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
        {person.headline && (
          <p className="text-[13px] text-zinc-400 mt-0.5 truncate">{person.headline}</p>
        )}
        {about && <p className="text-xs text-zinc-500 mt-1.5 line-clamp-2">{about}</p>}
        {person.looking_for && (
          <p className="text-xs text-lime-300/80 mt-1.5 line-clamp-2">→ {person.looking_for}</p>
        )}
        {person.linkedin_url && (
          <a
            href={person.linkedin_url}
            target="_blank"
            rel="noreferrer"
            className="inline-block text-[11px] uppercase tracking-wider text-zinc-500 hover:text-lime-300 mt-2"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
