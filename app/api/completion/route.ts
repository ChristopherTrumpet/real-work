import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/**
 * Record a challenge completion for the authenticated user.
 *
 * curl example (replace URL, token, and post UUID):
 *
 * ```bash
 * curl -sS -X POST "http://localhost:3000/api/completion" \
 *   -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
 *   -H "Content-Type: application/json" \
 *   -d '{"postId":"00000000-0000-0000-0000-000000000000"}'
 * ```
 *
 * The access token is the same JWT from `supabase.auth.getSession()` (or the
 * `access_token` field after password / OAuth sign-in). RLS requires the token
 * subject to match the row’s `user_id`.
 *
 * Challenge containers started via `deployContainer` / draft builder / studio also receive:
 * - `REALWORK_SUPABASE_ACCESS_TOKEN` — raw JWT (use as `Authorization: Bearer <token>`)
 * - `REALWORK_POST_ID` — UUID string (omit on generic studio sessions without a post)
 */

function supabaseForRequest(accessToken: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "Missing Authorization header. Use: Authorization: Bearer <supabase_access_token>",
      },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId =
    typeof body === "object" &&
    body !== null &&
    "postId" in body &&
    typeof (body as { postId: unknown }).postId === "string"
      ? (body as { postId: string }).postId.trim()
      : null;

  if (!postId) {
    return NextResponse.json(
      { error: "Body must include a string postId" },
      { status: 400 },
    );
  }

  const supabase = supabaseForRequest(token);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Invalid or expired access token" },
      { status: 401 },
    );
  }

  console.log(
    `[completion] Recording completion for user ${user.id} on post ${postId}`,
  );

  const { error } = await supabase.from("user_completions").insert({
    user_id: user.id,
    post_id: postId,
  });

  if (error) {
    if (error.code === "23505") {
      console.log(
        `[completion] User ${user.id} already completed post ${postId}. Redirecting...`,
      );
      revalidatePath("/preview");
      revalidatePath("/studio");
      revalidatePath("/");
      revalidatePath(`/challenge/${postId}`);
      revalidatePath(`/challenge/${postId}/complete`);

      // Still try to kill the container just in case it's running
      try {
        const scriptPath = path.join(process.cwd(), "kill-user-container.sh");
        await execAsync(`bash ${scriptPath} ${user.id} ${postId}`);
      } catch (e) {
        console.error(
          `[completion] Failed to kill container for already completed post:`,
          e,
        );
      }

      // return NextResponse.redirect(
      //   new URL(`/challenge/${postId}/complete`, request.url),
      // );
      return NextResponse.json({ success: true, alreadyCompleted: true });
      }
      console.error(`[completion] Database error: ${error.message}`);
      return NextResponse.json({ error: error.message }, { status: 400 });
      }

      console.log(`[completion] Successfully recorded completion. Killing container...`);

      // Kill the container immediately
      try {
      const scriptPath = path.join(process.cwd(), 'kill-user-container.sh');
      await execAsync(`bash ${scriptPath} ${user.id} ${postId}`);
      console.log(`[completion] Container killed successfully.`);
      } catch (e) {
      console.error(`[completion] Failed to kill container:`, e);
      // Continue even if killing fails, as the completion was recorded
      }

      revalidatePath("/preview");
      revalidatePath("/studio");
      revalidatePath("/");
      revalidatePath(`/challenge/${postId}`);
      revalidatePath(`/challenge/${postId}/complete`);

      console.log(`[completion] Returning success JSON for user ${user.id}.`);
      return NextResponse.json({ success: true });
      }

