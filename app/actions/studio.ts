'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import fs from 'fs'
import path from 'path'
import Docker from 'dockerode'
import tar from 'tar-fs'
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

export async function startStudioSession() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const image = 'challenge01'
  const internalPort = '3000'
  let hostPort = ''
  let containerId = ''

  try {
    // Pull image if not exists
    let imageInfo;
    try {
      imageInfo = await docker.getImage(image).inspect();
    } catch (e: any) {
      if (e.statusCode === 404) {
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
      }
    }

    const createOptions: Docker.ContainerCreateOptions = {
      Image: image,
      HostConfig: {
        ShmSize: 1024 * 1024 * 1024,
        Binds: [`studio-${user.id}:/config`],
        PortBindings: {
          [`${internalPort}/tcp`]: [{ HostPort: '0' }]
        }
      }
    };

    const container = await docker.createContainer(createOptions);
    await container.start();
    containerId = container.id;

    let permSuccess = false;
    for (let i = 0; i < 5; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const exec = await container.exec({
          Cmd: ['chmod', '-R', '777', '/config'],
          User: 'root',
          AttachStdout: true,
          AttachStderr: true
        });
        await exec.start({});
        await new Promise(resolve => setTimeout(resolve, 500));
        permSuccess = true;
        break; 
      } catch (permError) {}
    }

    const containerInfo = await container.inspect();
    const networkSettings = containerInfo.NetworkSettings;
    const ports = networkSettings.Ports;
    
    if (ports && ports[`${internalPort}/tcp`] && ports[`${internalPort}/tcp`].length > 0) {
      hostPort = ports[`${internalPort}/tcp`][0].HostPort;
    } else {
      throw new Error('Could not determine assigned host port');
    }
  } catch (error: any) {
    console.error('Studio Error:', error)
    redirect('/error?message=' + encodeURIComponent('Failed to start studio: ' + (error.message || String(error))))
  }

  redirect(`/studio?port=${hostPort}&containerId=${containerId}`)
}

export async function publishChallenge(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/error?message=' + encodeURIComponent('You must be logged in to publish'))
  }

  const containerId = formData.get('containerId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const difficulty = formData.get('difficulty') as string
  const tagsStr = formData.get('tags') as string

  if (!containerId || !title) {
    redirect('/error?message=' + encodeURIComponent('Missing required fields'))
  }

  const tags = tagsStr 
    ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) 
    : []

  const imageName = `user-${user.id.substring(0,8).toLowerCase()}-${Date.now()}`
  let baseImageName = `${imageName}-base`;
  const tmpBuildDir = path.join(process.cwd(), 'tmp_build', containerId);

  try {
    const container = docker.getContainer(containerId);

    // 1. Determine the working directory (volume) to extract
    let workdir = '/config'
    try {
      const inspectInfo = await container.inspect();
      const trimmedWorkdir = inspectInfo.Config.WorkingDir;
      if (trimmedWorkdir && trimmedWorkdir !== '/') {
        workdir = trimmedWorkdir;
      } else {
        const volumes = inspectInfo.Config.Volumes;
        if (volumes) {
          const volKeys = Object.keys(volumes);
          if (volKeys.length > 0) {
            workdir = volKeys.includes('/config') ? '/config' : volKeys[0];
          }
        }
      }
    } catch(e) {}

    // 2. Setup a temporary build context
    fs.mkdirSync(tmpBuildDir, { recursive: true })

    // 3. Extract the volume contents from the running studio container
    const extractPath = path.join(tmpBuildDir, 'raw_archive');
    fs.mkdirSync(extractPath, { recursive: true });
    
    const archiveStream = await container.getArchive({ path: workdir });
    await new Promise((resolve, reject) => {
      archiveStream.pipe(tar.extract(extractPath))
        .on('finish', resolve)
        .on('error', reject);
    });

    const extractedItems = fs.readdirSync(extractPath);
    if (extractedItems.length === 1) {
      fs.renameSync(path.join(extractPath, extractedItems[0]), path.join(tmpBuildDir, 'workspace_data'));
      fs.rmSync(extractPath, { recursive: true, force: true });
    } else {
      fs.renameSync(extractPath, path.join(tmpBuildDir, 'workspace_data'));
    }

    // 4. Commit the base container (captures changes outside the volume)
    await container.commit({ repo: baseImageName });

    // 5. Create a Dockerfile to bake the extracted volume back into the final image
    const dockerfileContent = `
FROM ${baseImageName}
# Copy the extracted volume data back into the container's working directory
COPY workspace_data ${workdir}
# Ensure permissions are correct
USER root
RUN chmod -R 777 ${workdir} || true
`
    fs.writeFileSync(path.join(tmpBuildDir, 'Dockerfile'), dockerfileContent)

    // 6. Build the final image on the remote docker daemon
    const packStream = tar.pack(tmpBuildDir);
    await new Promise((resolve, reject) => {
      docker.buildImage(packStream, { t: imageName }, (err: any, responseStream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(responseStream, (buildErr: any, output: any) => {
          if (buildErr) reject(buildErr);
          else resolve(output);
        });
      });
    });

    // 7. Clean up everything
    await container.stop();
    await container.remove();
    
    const baseImage = docker.getImage(baseImageName);
    await baseImage.remove();
    
    fs.rmSync(tmpBuildDir, { recursive: true, force: true });

  } catch (error: any) {
    console.error('Docker commit error:', error)
    if (fs.existsSync(tmpBuildDir)) {
      fs.rmSync(tmpBuildDir, { recursive: true, force: true });
    }
    redirect('/error?message=' + encodeURIComponent('Failed to save container image: ' + (error.message || String(error))))
  }

  const { error } = await supabase.from('posts').insert({
    user_id: user.id,
    title,
    description,
    difficulty,
    tags,
    content_url: imageName
  })

  if (error) {
    redirect('/error?message=' + encodeURIComponent(error.message))
  }

  redirect('/')
}
