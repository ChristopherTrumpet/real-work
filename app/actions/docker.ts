'use server'

import { redirect } from 'next/navigation'
import net from 'net'
import fs from 'fs'
import path from 'path'
import Docker from 'dockerode'
import * as https from 'https';

const dockerHostIp = process.env.DOCKER_HOST_IP || '127.0.0.1';

const dockerOptions: Docker.DockerOptions = {};

// Support both naming conventions from the setup script and the previous code
const caPem = process.env.DOCKER_CA_PEM || process.env.DOCKER_CA_CERT;
const clientPem = process.env.DOCKER_CLIENT_PEM || process.env.DOCKER_CLIENT_CERT;
const clientKeyPem = process.env.DOCKER_CLIENT_KEY_PEM || process.env.DOCKER_CLIENT_KEY;

if (caPem && clientPem && clientKeyPem) {
  const caContent = caPem.replace(/\\n/g, '\n');
  const certContent = clientPem.replace(/\\n/g, '\n');
  const keyContent = clientKeyPem.replace(/\\n/g, '\n');

  const agent = new https.Agent({
    ca: caContent,
    cert: certContent,
    key: keyContent,
    rejectUnauthorized: false,
    checkServerIdentity: (hostname, cert) => {
      return undefined;
    },
  });

  dockerOptions.host = dockerHostIp;
  dockerOptions.port = 2376;
  dockerOptions.protocol = 'https';
  dockerOptions.agent = agent;
} else if (process.env.DOCKER_HOST_IP) {
  dockerOptions.host = dockerHostIp;
  dockerOptions.port = 2375;
}

const docker = new Docker(dockerOptions);

export async function getDockerHostIp(): Promise<string> {
  return dockerHostIp;
}

export async function listVolumes(): Promise<string[]> {
  try {
    const volumesInfo = await docker.listVolumes();
    return (volumesInfo.Volumes || []).map(v => v.Name);
  } catch (error) {
    console.error('Error listing volumes:', error);
    return [];
  }
}

export async function testConnectivity(port: number): Promise<{ success: boolean; message: string }> {
  const host = dockerHostIp;
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const start = Date.now();
    
    socket.setTimeout(10000)
    socket.on('error', (err) => {
      socket.destroy()
      resolve({ success: false, message: `Connection failed to ${host}:${port} after ${Date.now() - start}ms: ${err.message}` })
    })
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, message: `Connection timed out to ${host}:${port} after ${Date.now() - start}ms` })
    })

    socket.connect(port, host, () => {
      socket.destroy()
      resolve({ success: true, message: `Successfully connected to ${host}:${port} in ${Date.now() - start}ms` })
    })
  })
}

export async function isContainerReady(port: number): Promise<boolean> {
  const host = dockerHostIp;
  console.log(`Checking readiness on ${host}:${port}...`);
  return new Promise((resolve) => {
    const socket = new net.Socket()
    const onError = (err: any) => {
      console.log(`Readiness check failed for ${host}:${port}: ${err.message || err}`);
      socket.destroy()
      resolve(false)
    }

    socket.setTimeout(5000)
    socket.on('error', onError)
    socket.on('timeout', () => onError('timeout'))

    socket.connect(port, host, () => {
      console.log(`Readiness check SUCCESS for ${host}:${port}`);
      socket.destroy()
      resolve(true)
    })
  })
}

export async function deployContainer(formData: FormData) {
  const image = formData.get('image') as string;
  const postId = formData.get('postId') as string;
  const userId = formData.get('userId') as string;
  const actionType = formData.get('actionType') as string || 'launch';
  const internalPort = '3000';

  if (!image) {
    redirect('/error?message=' + encodeURIComponent('Docker image name/URL is required'));
  }

  let hostPort = '';
  let workdir = '/config';

  try {
    let imageInfo;
    try {
      imageInfo = await docker.getImage(image).inspect();
    } catch (e: any) {
      if (e.statusCode === 404) {
        console.log(`Pulling image ${image}...`);
        await new Promise((resolve, reject) => {
          docker.pull(image, (err: any, stream: any) => {
            if (err) return reject(err);
            docker.modem.followProgress(stream, onFinished, onProgress);
            function onFinished(err: any, output: any) {
              if (err) return reject(err);
              resolve(output);
            }
            function onProgress(event: any) {}
          });
        });
        imageInfo = await docker.getImage(image).inspect();
      } else {
        throw e;
      }
    }

    try {
      const trimmedWorkdir = imageInfo.Config.WorkingDir;
      if (trimmedWorkdir && trimmedWorkdir !== '/') {
        workdir = trimmedWorkdir;
      } else {
        const volumes = imageInfo.Config.Volumes;
        if (volumes) {
          const volKeys = Object.keys(volumes);
          if (volKeys.length > 0) {
            workdir = volKeys.includes('/config') ? '/config' : volKeys[0];
          }
        }
      }
    } catch(e) {
      console.warn('Could not determine workdir, defaulting to /config.');
    }

    let binds: string[] = [];

    if (userId && postId) {
      const volumeName = `data-${userId}-${postId}`;
      
      if (actionType === 'restart') {
        try {
          const volume = docker.getVolume(volumeName);
          await volume.remove();
        } catch (e: any) {
          // Ignore if volume doesn't exist
        }
      }
      
      binds.push(`${volumeName}:${workdir}`);
    }

    const createOptions: Docker.ContainerCreateOptions = {
      Image: image,
      HostConfig: {
        ShmSize: 1024 * 1024 * 1024,
        Binds: binds,
        PortBindings: {
          [`${internalPort}/tcp`]: [{ HostPort: '0' }]
        }
      }
    };

    const container = await docker.createContainer(createOptions);
    await container.start();

    let permSuccess = false;
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const exec = await container.exec({
          Cmd: ['chmod', '-R', '777', workdir],
          User: 'root',
          AttachStdout: true,
          AttachStderr: true
        });
        const execStream = await exec.start({});
        // Wait briefly for chmod to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        permSuccess = true;
        break; 
      } catch (permError: any) {
        console.warn(`Attempt ${i + 1} to fix permissions failed:`, permError.message || permError);
      }
    }
    
    if (!permSuccess) {
      console.error('Failed to update container permissions after multiple attempts.');
    }

    const containerInfo = await container.inspect();
    const networkSettings = containerInfo.NetworkSettings;
    const ports = networkSettings.Ports;
    
    if (ports && ports[`${internalPort}/tcp`] && ports[`${internalPort}/tcp`].length > 0) {
      hostPort = ports[`${internalPort}/tcp`][0].HostPort;
    } else {
      throw new Error('Could not determine assigned host port from Docker');
    }

  } catch (error: any) {
    console.error('Docker Error:', error);
    redirect('/error?message=' + encodeURIComponent('Docker deployment failed: ' + (error.message || String(error))));
  }

  if (postId) {
    redirect(`/preview?port=${hostPort}&postId=${postId}`);
  } else {
    redirect(`/preview?port=${hostPort}`);
  }
}

export async function killContainer(port: number): Promise<{ success: boolean; message: string }> {
  if (!port) {
    return { success: false, message: 'Port not provided.' }
  }

  try {
    const containers = await docker.listContainers();
    const containerInfo = containers.find(c => {
      return c.Ports.some(p => p.PublicPort === Number(port));
    });

    if (!containerInfo) {
      return { success: false, message: `No container found on port ${port}.` };
    }

    const container = docker.getContainer(containerInfo.Id);
    
    await container.stop();
    await container.remove();

    return { success: true, message: `Container ${containerInfo.Id.substring(0, 12)} on port ${port} has been stopped and removed.` };
  } catch (error: any) {
    console.error('Docker Kill Error:', error);
    return { success: false, message: error.message || String(error) };
  }
}
