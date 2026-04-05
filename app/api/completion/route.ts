import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/**
 * Record a challenge completion for the authenticated user.
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
  console.log(`[api/completion] Received request at ${new Date().toISOString()}`);
  
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;

  if (!token) {
    console.error("[api/completion] Missing Authorization header");
    return NextResponse.json(
      { error: "Missing Authorization header" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
    console.log(`[api/completion] Body:`, body);
  } catch {
    console.error("[api/completion] Invalid JSON body");
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const postId = (body as any)?.postId?.trim();

  if (!postId) {
    console.error("[api/completion] Missing postId in body");
    return NextResponse.json(
      { error: "Body must include a string postId" },
      { status: 400 }
    );
  }

  const supabase = supabaseForRequest(token);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("[api/completion] Auth error or user not found:", authError);
    return NextResponse.json(
      { error: "Invalid or expired access token" },
      { status: 401 },
    );
  }

  console.log(`[api/completion] Authenticated user: ${user.id} for post: ${postId}`);

  // 1. Record completion in DB
  const { error: completionError } = await supabase.from("user_completions").insert({
    user_id: user.id,
    post_id: postId,
  });

  if (completionError) {
    if (completionError.code === "23505") {
      console.log(`[api/completion] Already completed. Continuing to kill...`);
    } else {
      console.error(`[api/completion] DB Error: ${completionError.message}`);
      return NextResponse.json({ error: completionError.message }, { status: 400 });
    }
  }

  // 2. Revalidate paths immediately
  console.log(`[api/completion] Revalidating paths...`);
  revalidatePath("/preview");
  revalidatePath("/studio");
  revalidatePath("/");
  revalidatePath(`/challenge/${postId}`);
  revalidatePath(`/challenge/${postId}/complete`);

  // 3. Kill the container immediately using the background script
  console.log(`[api/completion] Triggering container kill script...`);
  try {
    const scriptPath = path.join(process.cwd(), 'kill-user-container.sh');
    // We run this in the background (fire and forget) to return the response faster,
    // OR we can await it if we want to be sure. User said "immediately after successful ping".
    execAsync(`bash ${scriptPath} ${user.id} ${postId}`).then(({ stdout, stderr }) => {
      console.log(`[api/completion] Kill script output:`, stdout);
      if (stderr) console.error(`[api/completion] Kill script stderr:`, stderr);
    }).catch(err => {
      console.error(`[api/completion] Kill script failed:`, err);
    });
  } catch (e) {
    console.error(`[api/completion] Error initiating kill script:`, e);
  }

  console.log(`[api/completion] Returning success JSON`);
  return NextResponse.json({ success: true, message: "Completion recorded and container termination initiated." });
}
