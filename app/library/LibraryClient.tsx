"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ChallengeFeedCard,
  type ChallengeFeedItem,
} from "@/components/ChallengeFeedCard";
import Link from "next/link";
import { escapeIlikePattern } from "@/lib/search";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SignalLow, SignalMedium, SignalHigh } from "lucide-react";

type PostRow = ChallengeFeedItem & {
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Difficulty = "all" | "easy" | "medium" | "hard";
type ChallengeSort = "latest" | "ranking";

const PAGE_SIZE = 12;

export default function LibraryClient({
  initialUserId,
}: {
  initialUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [challenges, setChallenges] = useState<PostRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    const d = searchParams.get("difficulty") as Difficulty | null;
    return d === "easy" || d === "medium" || d === "hard" ? d : "all";
  });
  const [sort, setSort] = useState<ChallengeSort>(() =>
    searchParams.get("sort") === "ranking" ? "ranking" : "latest",
  );
  const [tag, setTag] = useState(() => searchParams.get("tag") ?? "");

  // Sync filter state to URL
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) p.set("q", trimmed);
    if (difficulty !== "all") p.set("difficulty", difficulty);
    if (sort !== "latest") p.set("sort", sort);
    if (tag.trim()) p.set("tag", tag.trim());
    const qs = p.toString();
    router.replace(qs ? `/library?${qs}` : "/library", { scroll: false });
  }, [q, difficulty, sort, tag, router]);

  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(syncUrl, 280);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [syncUrl]);

  const fetchChallenges = useCallback(
    async (
      pageNumber: number,
      filters: {
        q: string;
        difficulty: Difficulty;
        sort: ChallengeSort;
        tag: string;
      },
    ) => {
      const supabase = createClient();
      const from = pageNumber * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("posts")
        .select("*, profiles!user_id(username, full_name, avatar_url)")
        .eq("is_draft", false);

      const term = filters.q.trim();
      if (term) {
        const pat = `%${escapeIlikePattern(term)}%`;
        query = query.or(`title.ilike.${pat},description.ilike.${pat}`);
      }

      if (filters.difficulty !== "all")
        query = query.eq("difficulty", filters.difficulty);

      const tagTrim = filters.tag.trim().toLowerCase();
      if (tagTrim) query = query.contains("tags", [tagTrim]);

      if (filters.sort === "latest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query
          .order("average_rating", { ascending: false, nullsFirst: false })
          .order("number_of_completions", { ascending: false });
      }

      const { data, error } = await query.range(from, to);
      if (error) {
        console.error("Error fetching challenges:", error);
        return [];
      }
      return data as PostRow[];
    },
    [],
  );

  const fetchProfiles = useCallback(async (term: string) => {
    if (!term.trim()) return [];
    const supabase = createClient();
    const pat = `%${escapeIlikePattern(term.trim())}%`;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio")
      .or(`username.ilike.${pat},full_name.ilike.${pat}`)
      .limit(5);
    if (error) {
      console.error(error);
      return [];
    }
    return (data as ProfileRow[]) ?? [];
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    const [challengeData, profileData] = await Promise.all([
      fetchChallenges(0, { q, difficulty, sort, tag }),
      fetchProfiles(q),
    ]);
    setChallenges(challengeData);
    setProfiles(profileData);
    setHasMore(challengeData.length === PAGE_SIZE);
    setPage(0);
    setLoading(false);
  }, [fetchChallenges, fetchProfiles, q, difficulty, sort, tag]);

  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    fetchTimerRef.current = setTimeout(() => {
      void initialLoad();
    }, 300);
    return () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
    };
  }, [initialLoad]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    const data = await fetchChallenges(nextPage, { q, difficulty, sort, tag });
    setChallenges((prev) => [...prev, ...data]);
    setPage(nextPage);
    setHasMore(data.length === PAGE_SIZE);
    setLoadingMore(false);
  };

  const selectClass =
    "h-10 w-full min-w-[10rem] cursor-pointer rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

  const hasActiveFilters = q || difficulty !== "all" || tag;
  const searching = q.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Challenge Library
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Browse our complete collection of interactive engineering challenges.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-10 space-y-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search challenges and people…"
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring shadow-sm"
          autoComplete="off"
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-border pt-6">
          <div className="space-y-1.5">
            <label
              htmlFor="lib-sort"
              className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Sort By
            </label>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as ChallengeSort)}
            >
              <SelectTrigger id="lib-sort" className="h-10">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest</SelectItem>
                <SelectItem value="ranking">Top Rated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lib-difficulty"
              className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Difficulty
            </label>
            <Select
              value={difficulty}
              onValueChange={(value) => setDifficulty(value as Difficulty)}
            >
              <SelectTrigger id="lib-difficulty" className="h-10">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Difficulty</SelectItem>
                <SelectItem value="easy">
                  <div className="flex items-center gap-2">
                    <SignalLow className="size-3.5 text-emerald-500" />
                    <span>Easy</span>
                  </div>
                </SelectItem>
                <SelectItem value="medium">
                  <div className="flex items-center gap-2">
                    <SignalMedium className="size-3.5 text-amber-500" />
                    <span>Medium</span>
                  </div>
                </SelectItem>
                <SelectItem value="hard">
                  <div className="flex items-center gap-2">
                    <SignalHigh className="size-3.5 text-rose-500" />
                    <span>Hard</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="lib-tag"
              className="block text-xs font-bold uppercase tracking-widest text-muted-foreground"
            >
              Filter Tag
            </label>
            <input
              id="lib-tag"
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="e.g. docker, rust…"
              className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-2xl bg-muted/50 w-full"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          {/* People — only shown when there's a search query with profile results */}
          {searching && profiles.length > 0 && (
            <section className="animate-in fade-in slide-in-from-top-2 duration-300">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                People
              </h2>
              <ul className="flex flex-col gap-2">
                {profiles.map((p) =>
                  p.username ? (
                    <li key={p.id}>
                      <Link
                        href={`/u/${encodeURIComponent(p.username)}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={p.username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            (p.username[0] || "U").toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium text-foreground">
                            {p.full_name || p.username}
                          </span>
                          <span className="ml-2 text-sm text-muted-foreground">
                            @{p.username}
                          </span>
                          {p.bio && (
                            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
                              {p.bio}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ) : null,
                )}
              </ul>
            </section>
          )}

          {/* Challenges */}
          {challenges.length > 0 ? (
            <section>
              {searching && (
                <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Challenges
                </h2>
              )}
              <div className="grid grid-cols-3 gap-4">
                {challenges.map((challenge, i) => (
                  <div
                    key={challenge.id}
                    className="animate-fade-up"
                    style={
                      { "--stagger": i % PAGE_SIZE } as React.CSSProperties
                    }
                  >
                    <ChallengeFeedCard
                      container={challenge}
                      userId={initialUserId}
                      hasSession={false}
                      size="sm"
                    />
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-border bg-card px-10 text-base font-semibold text-foreground shadow-sm transition-colors hover:bg-muted disabled:opacity-50 cursor-pointer"
                  >
                    {loadingMore ? (
                      <span className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Loading…
                      </span>
                    ) : (
                      "Load More Challenges"
                    )}
                  </button>
                </div>
              )}
            </section>
          ) : (
            (!searching || profiles.length === 0) && (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 py-16 text-center">
                <p className="text-xl font-semibold text-foreground">
                  No challenges found
                </p>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your filters or search terms.
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setQ("");
                      setDifficulty("all");
                      setTag("");
                    }}
                    className="mt-6 text-primary font-medium hover:underline cursor-pointer"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
