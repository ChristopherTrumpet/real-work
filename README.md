# real_work

**Master real-world engineering through hands-on, high-stakes scenarios.**

## Inspiration
Engineering is more than just passing a coding interview. In the real world, you aren't asked to invert a binary tree on a whiteboard; you're asked to debug a production race condition, optimize a slow database query, or fix a broken CI/CD pipeline. We were tired of the "LeetCode vacuum" where problems are disconnected from actual infrastructure. We wanted a platform where the environment is as much a part of the challenge as the code itself.

## What it does
`real_work` provides a marketplace of engineering "labs" that run inside fully isolated Docker containers. Unlike traditional platforms that only give you a text editor, `real_work` gives you a full Linux environment.
- **Hands-on Labs:** Solve challenges ranging from backend performance tuning to distributed systems debugging.
- **Persistence:** Progress is saved automatically. When you leave a workspace, your exact container state is committed to a local image, allowing you to resume exactly where you left off.
- **Performance Benchmarking:** Compare your solutions against "Gold Standard" implementations with built-in execution timing and correctness verification.
- **Community-Driven:** Anyone can publish a challenge by linking a GitHub repository. Users can rate, comment, and discuss strategies for every lab.

## How we built it
The platform is a modern full-stack application built with:
- **Frontend:** Next.js 15 (App Router) with TailwindCSS for a sleek, engineering-focused UI.
- **Backend/Auth:** Supabase for real-time database management, user authentication, and storage (thumbnails/avatars).
- **Infrastructure:** A custom Node.js/Docker orchestration layer that manages container lifecycles, port mapping, and state persistence using `docker commit`.
- **Challenge Creator:** A multi-step wizard that parses GitHub repositories, extracts function signatures, and allows authors to bake custom configurations into reusable Docker images.

## Challenges we ran into
- **State Persistence:** Moving beyond simple volume mounts to a robust `docker commit` workflow was difficult. We had to ensure that user progress was captured across sessions without bloating the local filesystem.
- **Windows Compatibility:** Navigating the differences between Docker on Windows (PowerShell/WSL) and Linux required careful path sanitization and permission handling (`chmod` in-container vs. Windows paths).
- **Security:** Running arbitrary user code is dangerous. We implemented multi-layered isolation to ensure that containers remain sandboxed and system-level access is restricted.

## Accomplishments that we're proud of
- **The "Resume" Experience:** Achieving a "VM-like" feel where you can close your browser, turn off your computer, and come back to the same terminal state.
- **The Creator Wizard:** Building a tool that can take a raw GitHub URL and transform it into a ready-to-solve engineering challenge in under a minute.
- **Unified Thematic UI:** Creating a cohesive design language that feels professional and "alive," using consistent animations and interactive feedback.

## What we learned
- **Docker Internals:** We gained deep knowledge of the Docker Engine API, specifically image layering, committing container diffs, and dynamic port allocation.
- **Next.js Server Actions:** Leveraging Server Actions for complex infrastructure tasks (like launching containers) allowed us to keep the client light while maintaining a high level of security.
- **Context is King:** We learned that learners engage more deeply when they are "solving a fire" in a realistic environment than when they are solving abstract mathematical puzzles.

## What's next for real_work
- **Multi-Container Labs:** Supporting complex environments like "Debug this Kubernetes Cluster" or "Fix this Microservices Mesh."
- **Leaderboards & Competitions:** Real-time engineering sprints where the community competes to solve production incidents the fastest.
- **Company Tracks:** Helping companies build internal training labs that mirror their actual tech stacks.
