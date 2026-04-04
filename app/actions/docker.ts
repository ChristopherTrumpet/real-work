'use server'

import { redirect } from 'next/navigation'
import net from 'net'
import fs from 'fs'
import path from 'path'
import Docker from 'dockerode'
import * as https from 'https';

const remoteHostIp = process.env.DOCKER_HOST_IP;
const registryUrl = remoteHostIp ? `${remoteHostIp}:5000` : null;

// Local Docker
const isWindows = process.platform === 'win32';
const docker = new Docker(
  isWindows 
    ? { socketPath: '//./pipe/docker_engine' } 
    : { socketPath: '/var/run/docker.sock' }
);

// Remote Docker (Used for Volume Sync / Storage)
let remoteDocker: Docker | null = null;
const caPem = process.env.DOCKER_CA_PEM || process.env.DOCKER_CA_CERT;
const clientPem = process.env.DOCKER_CLIENT_PEM || process.env.DOCKER_CLIENT_CERT;
const clientKeyPem = process.env.DOCKER_CLIENT_KEY_PEM || process.env.DOCKER_CLIENT_KEY;

if (remoteHostIp && caPem && clientPem && clientKeyPem) {
  const agent = new https.Agent({
    ca: caPem.replace(/\\n/g, '\n'),
    cert: clientPem.replace(/\\n/g, '\n'),
    key: clientKeyPem.replace(/\\n/g, '\n'),
    rejectUnauthorized: false,
  });
  remoteDocker = new Docker({ host: remoteHostIp, port: 2376, protocol: 'https', agent });
}

async function ensureImage(imageName: string) {
  try {
    await docker.getImage(imageName).inspect();
    return imageName;
  } catch (e) {
    if (registryUrl && !imageName.includes('/')) {
      const remoteName = `${registryUrl}/${imageName}`;
      try {
        await new Promise((resolve, reject) => {
          docker.pull(remoteName, (err: any, stream: any) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
          });
        });
        return remoteName;
      } catch (pullErr) {
        console.warn(`Registry pull failed for ${imageName}, trying public.`);
      }
    }
    
    await new Promise((resolve, reject) => {
      docker.pull(imageName, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (err2: any) => err2 ? reject(err2) : resolve(true));
      });
    });
    return imageName;
  }
}

export async function getDockerHostIp(): Promise<string> {
  return 'localhost';
}

export async function listVolumes(): Promise<string[]> {
  try {
    const volumesInfo = await docker.listVolumes();
    return (volumesInfo.Volumes || []).map(v => v.Name);
  } catch (error) {
    console.error('Error listing local volumes:', error);
    return [];
  }
}

export async function isContainerReady(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(2000)
    socket.on('error', () => { socket.destroy(); resolve(false); })
    socket.on('timeout', () => { socket.destroy(); resolve(false); })
    socket.connect(port, 'localhost', () => { socket.destroy(); resolve(true); })
  })
}

export async function deployContainer(formData: FormData) {
  let image = formData.get('image') as string;
  const postId = formData.get('postId') as string;
  const userId = formData.get('userId') as string;
  const actionType = formData.get('actionType') as string || 'launch';
  const internalPort = '3000';

  if (!image) redirect('/error?message=Image required');

  let hostPort = '';

  try {
    const fullImageName = await ensureImage(image);
    const imageInfo = await docker.getImage(fullImageName).inspect();
    let workdir = imageInfo.Config.WorkingDir || '/config';
    let binds: string[] = [];

    if (userId && postId) {
      const volumeName = `data-${userId}-${postId}`;
      if (actionType === 'restart') {
        try { await docker.getVolume(volumeName).remove(); } catch (e) {}
      }
      
      // SYNC: If we wanted to fetch data from Oracle, we would do it here using remoteDocker
      binds.push(`${volumeName}:${workdir}`);
    }

    const container = await docker.createContainer({
      Image: fullImageName,
      HostConfig: {
        ShmSize: 1024 * 1024 * 1024,
        Binds: binds,
        PortBindings: { [`${internalPort}/tcp`]: [{ HostPort: '0' }] }
      }
    });

    await container.start();
    const containerInfo = await container.inspect();
    hostPort = containerInfo.NetworkSettings.Ports[`${internalPort}/tcp`][0].HostPort;
  } catch (error: any) {
    console.error('Deploy Error:', error);
    redirect('/error?message=' + encodeURIComponent(error.message));
  }

  redirect(`/preview?port=${hostPort}${postId ? `&postId=${postId}` : ''}`);
}

export async function killContainer(port: number): Promise<{ success: boolean; message: string }> {
  try {
    const containers = await docker.listContainers();
    const cInfo = containers.find(c => c.Ports.some(p => p.PublicPort === Number(port)));
    if (!cInfo) return { success: false, message: 'Not found' };
    const container = docker.getContainer(cInfo.Id);
    
    // SYNC: If we wanted to push data back to Oracle, we would do it here using remoteDocker
    
    await container.stop();
    await container.remove();
    return { success: true, message: 'Stopped' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}
