import { NextResponse } from 'next/server';
import Docker from 'dockerode';

// Initialize Docker. 
// By default, it connects to the local /var/run/docker.sock
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export async function POST(request: Request) {
  try {
    // 1. Create the container
    const container = await docker.createContainer({
      Image: 'challenge01', 
      name: `challenge01-${Date.now()}`,
      Tty: true,
      HostConfig: {
        // We need to auto set this to a port not in use
        PortBindings: {
          '3000/tcp': [{ HostPort: '4000' }], 
        },
        ShmSize: 1024 * 1024 * 1024,
      },
    });

    // 2. Start the container
    await container.start();

    // 3. Return the container ID to the frontend
    return NextResponse.json({ 
      success: true, 
      message: 'Container started!', 
      containerId: container.id 
    });

  } catch (error: any) {
    console.error("Docker Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}