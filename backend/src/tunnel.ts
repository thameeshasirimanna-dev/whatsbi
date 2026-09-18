import { config } from 'dotenv';
config({ path: '../.env' });
import { spawn } from 'child_process';

const port = process.env.PORT || '8080';
const authtoken = process.env.NGROK_AUTHTOKEN || '';
const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'aichatbot';

console.log(`Starting ngrok tunnel for Biz Agentz backend on port ${port}...`);

const args = ['ngrok', 'http', port];
if (authtoken) {
  args.push(`--authtoken=${authtoken}`);
}

const isWindows = process.platform === 'win32';
const ngrokProcess = spawn(isWindows ? 'npx.cmd' : 'npx', args, {
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true,
});

let tunnelUrlFound = false;

// Poll ngrok local web inspection API to extract the public URL
async function checkTunnelUrl() {
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    try {
      const res = await fetch('http://127.0.0.1:4040/api/tunnels');
      if (res.ok) {
        const data: any = await res.json();
        const httpsTunnel = data.tunnels?.find((t: any) => t.proto === 'https') || data.tunnels?.[0];
        if (httpsTunnel?.public_url) {
          tunnelUrlFound = true;
          console.log('\n=============================================================');
          console.log('  BIZ AGENTZ BACKEND NGROK TUNNEL LIVE');
          console.log('=============================================================');
          console.log(`  Public URL:           ${httpsTunnel.public_url}`);
          console.log(`  WhatsApp Webhook URL: ${httpsTunnel.public_url}/whatsapp-webhook`);
          console.log(`  Verify Token:         ${verifyToken}`);
          console.log(`  Local Forwarding:     http://localhost:${port}`);
          console.log('=============================================================\n');
          console.log('Use the WhatsApp Webhook URL and Verify Token in Meta App Dashboard.\n');
          break;
        }
      }
    } catch {
      // Waiting for ngrok web API to become ready
    }
  }
}

checkTunnelUrl();

ngrokProcess.stdout.on('data', (data) => {
  const str = data.toString();
  if (!tunnelUrlFound) {
    process.stdout.write(str);
  }
});

ngrokProcess.stderr.on('data', (data) => {
  const str = data.toString();
  process.stderr.write(str);
});

ngrokProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\nngrok process exited with code ${code}.`);
    if (!authtoken) {
      console.log('\nTip: If you saw ERR_NGROK_4018, you need an ngrok authtoken.');
      console.log('1. Sign up / log in at: https://dashboard.ngrok.com/signup');
      console.log('2. Copy your authtoken from: https://dashboard.ngrok.com/get-started/your-authtoken');
      console.log('3. Add to your root .env file: NGROK_AUTHTOKEN=your_token_here');
      console.log('   or run: npx ngrok config add-authtoken <TOKEN>');
    }
  }
});

process.on('SIGINT', () => {
  ngrokProcess.kill('SIGINT');
  process.exit(0);
});
