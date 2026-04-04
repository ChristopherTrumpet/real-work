'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import fs from 'fs'
import path from 'path'
import Docker from 'dockerode'
import tar from 'tar-fs'

const remoteHostIp = process.env.DOCKER_HOST_IP;
const registryUrl = remoteHostIp ? `${remoteHostIp}:5000` : null;

// Local Docker
const isWindows = process.platform === 'win32';
const docker = new Docker(
  isWindows 
    ? { socketPath: '//./pipe/docker_engine' } 
    : { socketPath: '/var/run/docker.sock' }
);

async function ensureImage(imageName: string) {
  // 1. Try local check first
  try {
    await docker.getImage(imageName).inspect();
    return imageName;
  } catch (e) {
    // 2. If not found and registry exists, try registry version
    if (registryUrl && !imageName.includes('/')) {
      const remoteName = `${registryUrl}/${imageName}`;
      try {
        console.log(`Checking remote registry for ${remoteName}...`);
        await new Promise((resolve, reject) => {
          docker.pull(remoteName, (err: any, stream: any) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
          });
        });
        return remoteName;
      } catch (pullErr) {
        console.warn(`Could not pull from registry: ${imageName}. Falling back to public hub.`);
      }
    }
    
    // 3. Fallback: Pull original name from public hub
    await new Promise((resolve, reject) => {
      docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
      });
    });
    return imageName;
  }
}

export async function startStudioSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let hostPort = ''
  let containerId = ''

  try {
    const imageName = await ensureImage('challenge01');
    const internalPort = '3000'

    const container = await docker.createContainer({
      Image: imageName,
      HostConfig: {
        ShmSize: 1024 * 1024 * 1024,
        Binds: [`studio-${user.id}:/config`],
        PortBindings: { [`${internalPort}/tcp`]: [{ HostPort: '0' }] }
      }
    });

    await container.start();
    containerId = container.id;
    const containerInfo = await container.inspect();
    hostPort = containerInfo.NetworkSettings.Ports[`${internalPort}/tcp`][0].HostPort;
    
    const exec = await container.exec({ Cmd: ['chmod', '-R', '777', '/config'], User: 'root' });
    await exec.start({});
  } catch (error: any) {
    console.error('Studio Error:', error)
    redirect('/error?message=' + encodeURIComponent('Failed to start studio: ' + (error.message || String(error))))
  }

  redirect(`/studio?port=${hostPort}&containerId=${containerId}`)
}

export async function publishChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/error?message=Unauthorized');

  const containerId = formData.get('containerId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const difficulty = formData.get('difficulty') as string
  const tagsStr = formData.get('tags') as string

  const localImageName = `user-${user.id.substring(0,8)}-${Date.now()}`
  const remoteImageName = registryUrl ? `${registryUrl}/${localImageName}` : localImageName;
  const tmpBuildDir = path.join(process.cwd(), 'tmp_build', containerId);

  try {
    const container = docker.getContainer(containerId);
    const inspectInfo = await container.inspect();
    let workdir = inspectInfo.Config.WorkingDir || '/config';

    fs.mkdirSync(tmpBuildDir, { recursive: true })
    const extractPath = path.join(tmpBuildDir, 'workspace_data');
    fs.mkdirSync(extractPath, { recursive: true });
    
    const archiveStream = await container.getArchive({ path: workdir });
    await new Promise((resolve, reject) => {
      archiveStream.pipe(tar.extract(extractPath)).on('finish', resolve).on('error', reject);
    });

    const extractedItems = fs.readdirSync(extractPath);
    if (extractedItems.length === 1) {
       const subDir = path.join(extractPath, extractedItems[0]);
       if (fs.statSync(subDir).isDirectory()) {
         const items = fs.readdirSync(subDir);
         items.forEach(item => fs.renameSync(path.join(subDir, item), path.join(extractPath, item)));
         fs.rmdirSync(subDir);
       }
    }

    await container.commit({ repo: localImageName });

    fs.writeFileSync(path.join(tmpBuildDir, 'Dockerfile'), `
FROM ${localImageName}
COPY workspace_data ${workdir}
USER root
RUN chmod -R 777 ${workdir} || true
`)

    const packStream = tar.pack(tmpBuildDir);
    await new Promise((resolve, reject) => {
      docker.buildImage(packStream, { t: remoteImageName }, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
      });
    });

    if (registryUrl) {
      console.log(`Pushing ${remoteImageName} to Oracle...`);
      const image = docker.getImage(remoteImageName);
      await new Promise((resolve, reject) => {
        image.push({}, (err: any, stream: any) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
        });
      });
    }

    await container.stop();
    await container.remove();
    fs.rmSync(tmpBuildDir, { recursive: true, force: true });

    const { error } = await supabase.from('posts').insert({
      user_id: user.id,
      title,
      description,
      difficulty,
      tags: tagsStr ? tagsStr.split(',').map(t => t.trim()) : [],
      content_url: localImageName
    })

    if (error) throw error;
  } catch (error: any) {
    console.error('Publish Error:', error)
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  redirect('/')
}
