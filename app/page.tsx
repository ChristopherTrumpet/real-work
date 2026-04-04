import {
  ChallengeCard,
  type ChallengeCardProps,
} from "@/components/challenge-card";

const sampleChallenges: ChallengeCardProps[] = [
  {
    title: "Ship a dark-mode toggle in one hour",
    tags: ["UI", "React", "Beginner"],
    bannerSrc: "/globe.svg",
    bannerAlt: "Abstract globe graphic",
  },
  {
    title: "Optimize Largest Contentful Paint",
    tags: ["Performance", "Web Vitals"],
  },
  {
    title: "Design a pricing table that converts",
    tags: ["UX", "Copy"],
    bannerSrc: "/window.svg",
    bannerAlt: "Window frame illustration",
  },
  {
    title: "Secure your API with rate limiting",
    tags: ["Backend", "Security"],
  },
  {
    title: "Build a keyboard-friendly command palette",
    tags: ["A11y", "Patterns"],
    bannerSrc: "/next.svg",
    bannerAlt: "Next.js logo",
  },
  {
    title: "Refactor a legacy form to RSC",
    tags: ["Next.js", "Advanced"],
  },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Challenges
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Responsive grid of challenge cards. Hover a banner to reveal the
          play control.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sampleChallenges.map((c) => (
          <ChallengeCard key={c.title} {...c} />
        ))}
      </div>
    </main>
  );
}
