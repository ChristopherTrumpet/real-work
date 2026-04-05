"use server";

import { exec, execFile, spawn } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";
import { createClient } from "@/utils/supabase/server";
import {
  createDockerCompletionEnvFile,
  deleteDockerEnvFile,
} from "@/lib/docker-run-env";
import { initBuild, appendLog, finishBuild, failBuild } from "@/lib/build-logs";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export interface BuildDraftConfig {
  title: string;
  description: string;
  difficulty: string;
  tags?: string;
  repoUrl?: string;
  thumbnailUrl?: string;
  setupScript?: string;
}

/**
 * Builds and deploys a local draft container for the challenge creator.
 * Uses a single, high-performance universal base image.
 */
export async function buildDraftContainer(config: BuildDraftConfig) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { title, description, difficulty, tags, thumbnailUrl, setupScript } =
    config;
  const apiKey = crypto.randomBytes(32).toString("hex");

  // 1. Create draft record immediately to get an ID
  const { data: postData, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      title,
      description,
      difficulty,
      tags: tags
        ? tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      content_url: "pending",
      api_key: apiKey,
      thumbnail_url: thumbnailUrl,
      setup_script: setupScript,
      is_draft: true,
    })
    .select()
    .single();

  if (error) throw new Error("Database error: " + error.message);

  const buildId = `draft-${postData.id.substring(0, 8)}`;
  const localImageName = `draft-${postData.id}`;

  initBuild(buildId);

  // 2. Start the background build process
  runDraftBuildProcess(
    buildId,
    localImageName,
    config,
    user.id,
    apiKey,
    postData.id,
  );

  return { success: true, buildId, postId: postData.id };
}

async function runDraftBuildProcess(
  buildId: string,
  imageName: string,
  config: BuildDraftConfig,
  userId: string,
  apiKey: string,
  postId: string,
) {
  const { repoUrl, setupScript } = config;
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "draft-builder-"));
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  try {
    appendLog(buildId, `Preparing universal workspace environment...`, true);

    // 1. Write the setup script to the temp directory
    const setupScriptPath = path.join(tmpDir, "setup.sh");
    await fs.writeFile(setupScriptPath, setupScript || "#!/bin/bash\nexit 0");

    // Standard high-performance Dockerfile for ALL challenges
    // No more templates - just a solid base with everything a dev needs
    const dockerfileContent = `
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:0

RUN apt-get update && apt-get install -y --no-install-recommends \\
    software-properties-common curl wget git sudo ca-certificates \\
    python3 python3-pip dbus-x11 x11-utils x11-xserver-utils \\
    gnupg gpg-agent

RUN add-apt-repository ppa:mozillateam/ppa -y && \\
    echo 'Package: *\\nPin: release o=LP-PPA-mozillateam\\nPin-Priority: 1001' > /etc/apt/preferences.d/mozilla-firefox

RUN apt-get update && apt-get install -y --no-install-recommends \\
    tigervnc-standalone-server \\
    xfce4 \\
    xfce4-terminal \\
    novnc \\
    websockify \\
    firefox \\
    adwaita-icon-theme tango-icon-theme humanity-icon-theme \\
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libgbm1 libasound2 \\
    libsecret-1-0 libgtk-3-0 \\
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \\
    && apt-get install -y nodejs \\
    && ARCH=$(dpkg --print-architecture) \\
    && if [ "$ARCH" = "arm64" ]; then VSCODE_ARCH="linux-deb-arm64"; else VSCODE_ARCH="linux-deb-x64"; fi \\
    && wget -qO vscode.deb "https://code.visualstudio.com/sha/download?build=stable&os=\${VSCODE_ARCH}" \\
    && apt-get install -y ./vscode.deb \\
    && rm vscode.deb \\
    && rm -rf /var/lib/apt/lists/*
RUN dbus-uuidgen > /var/lib/dbus/machine-id || true

RUN echo '<meta http-equiv="refresh" content="0; url=vnc.html?autoconnect=true&resize=remote">' > /usr/share/novnc/index.html

# Create the developer user
RUN useradd -m -s /bin/bash -u 1000 developer && \\
    echo "developer ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Setup directories and permissions
RUN mkdir -p /workspace /dockerstartup && \\
    chown -R developer:developer /workspace /dockerstartup

# Clone repo if provided (Done as root, then chowned to developer)
WORKDIR /workspace
${repoUrl ? `RUN git clone ${repoUrl} . && chown -R developer:developer /workspace` : 'RUN echo "Starting with empty workspace" > README.md && chown developer:developer README.md'}

# Copy and setup the initialization script
COPY --chown=developer:developer setup.sh /dockerstartup/setup.sh
RUN chmod +x /dockerstartup/setup.sh

# Create Entrypoint
RUN echo '#!/bin/bash' > /entrypoint.sh && \\
    echo 'sudo rm -f /tmp/.X*-lock /tmp/.X11-unix/X*' >> /entrypoint.sh && \\
    echo 'Xvnc :0 -SecurityTypes None -localhost -geometry 1490x715 -depth 24 &' >> /entrypoint.sh && \\
    echo 'sleep 1' >> /entrypoint.sh && \\
    echo 'startxfce4 &' >> /entrypoint.sh && \\
    echo 'sleep 2' >> /entrypoint.sh && \\
    echo '/dockerstartup/custom_startup.sh' >> /entrypoint.sh && \\
    echo 'websockify --web /usr/share/novnc/ 3000 localhost:5900' >> /entrypoint.sh && \\
    chmod +x /entrypoint.sh && \\
    chown developer:developer /entrypoint.sh

# Create custom startup that executes the user's setup script
RUN echo '#!/bin/bash' > /dockerstartup/custom_startup.sh && \\
    echo 'export DISPLAY=:0' >> /dockerstartup/custom_startup.sh && \\
    echo '/dockerstartup/setup.sh' >> /dockerstartup/custom_startup.sh && \\
    echo 'code /workspace --no-sandbox --disable-gpu &' >> /dockerstartup/custom_startup.sh && \\
    chmod +x /dockerstartup/custom_startup.sh && \\
    chown developer:developer /dockerstartup/custom_startup.sh

USER developer
ENV USER=developer
ENV HOME=/home/developer

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
`;

    await fs.writeFile(path.join(tmpDir, "Dockerfile"), dockerfileContent);

    // 3. Build local image (Fast local build, not pushed to cloud yet)
    appendLog(buildId, `Building workspace image...`, true);

    await new Promise((resolve, reject) => {
      const child = spawn("docker", ["build", "-t", imageName, tmpDir]);
      child.stdout.on("data", (data) =>
        appendLog(buildId, data.toString().trim()),
      );
      child.stderr.on("data", (data) =>
        appendLog(buildId, `[build] ${data.toString().trim()}`),
      );
      child.on("close", (code) => {
        if (code === 0) resolve(true);
        else reject(new Error(`Build failed with code ${code}`));
      });
    });

    // 4. Provision the live container (token + draft post id for /api/completion from inside the VM)
    appendLog(buildId, `Launching local instance...`, true);
    const internalPort = "3000";
    let envFile: string | null = null;
    let containerId = "";
    try {
      envFile = await createDockerCompletionEnvFile({
        accessToken: session?.access_token,
        postId,
      });
      const runArgs = ["run", "-d", "--shm-size=1gb", "-p", `0:${internalPort}`];
      if (envFile) runArgs.push("--env-file", envFile);
      runArgs.push(imageName);
      const { stdout: runStdout } = await execFileAsync("docker", runArgs, {
        maxBuffer: 10 * 1024 * 1024,
      });
      containerId = runStdout.trim();
    } finally {
      await deleteDockerEnvFile(envFile);
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 5. Get assigned port
    let hostPort = "";
    try {
      const portCmd = `docker port ${containerId} ${internalPort}`;
      const { stdout: pStdout } = await execAsync(portCmd);
      const match = pStdout.match(/:(\d+)/);
      if (!match) throw new Error("Could not determine assigned host port");
      hostPort = match[1];
    } catch (e) {
      throw new Error("Failed to retrieve host port mapping.");
    }

    // 6. Finalize record
    appendLog(buildId, `Draft workspace ready.`, true);
    await supabase
      .from("posts")
      .update({
        content_url: imageName,
      })
      .eq("id", postId);

    finishBuild(buildId, {
      port: hostPort,
      containerId,
      postId: postId,
    });
  } catch (error) {
    console.error("Draft Builder Error:", error);
    const message = error instanceof Error ? error.message : String(error);
    failBuild(buildId, message);
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
