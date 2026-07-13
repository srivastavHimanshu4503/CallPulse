import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import twilio from 'twilio';

// Load env variables manually from apps/voice-server/.env
const envPath = path.resolve('./.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const port = env.PORT || 3001;
const accountSid = env.TWILIO_ACCOUNT_SID;
const authToken = env.TWILIO_AUTH_TOKEN;
const phoneNumber = env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !phoneNumber) {
  console.error("Missing Twilio credentials in apps/voice-server/.env");
  process.exit(1);
}

async function getNgrokUrl() {
  try {
    const res = await fetch('http://localhost:4040/api/tunnels');
    if (res.ok) {
      const data = await res.json();
      const tunnel = data.tunnels.find(t => t.proto === 'https');
      if (tunnel) return tunnel.public_url;
    }
  } catch (e) {
    // ngrok not running
  }
  return null;
}

async function main() {
  let url = await getNgrokUrl();
  if (!url) {
    console.log("ngrok is not running. Starting ngrok http " + port + "...");
    const ngrokProcess = spawn('ngrok', ['http', port.toString()], {
      detached: true,
      stdio: 'ignore'
    });
    ngrokProcess.unref();

    // Poll for 5 seconds
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      url = await getNgrokUrl();
      if (url) break;
    }
  }

  if (!url) {
    console.error("Failed to get ngrok URL. Is ngrok installed and configured?");
    process.exit(1);
  }

  console.log("Found ngrok tunnel URL:", url);
  const webhookUrl = `${url}/webhook/call/inbound`;
  console.log("Setting webhook URL to:", webhookUrl);

  const client = twilio(accountSid, authToken);
  const numbers = await client.incomingPhoneNumbers.list({ phoneNumber });
  if (numbers.length === 0) {
    console.error("Could not find phone number " + phoneNumber + " in your Twilio account.");
    process.exit(1);
  }

  const numberSid = numbers[0].sid;
  await client.incomingPhoneNumbers(numberSid).update({
    voiceUrl: webhookUrl,
    voiceMethod: 'POST'
  });

  console.log("\n========================================================");
  console.log(`🎉 SUCCESS! Phone number ${phoneNumber} is now linked to:`);
  console.log(`👉 ${webhookUrl}`);
  console.log("========================================================");
  console.log("\nYou can now place a call to " + phoneNumber + "!");
  console.log("Make sure your voice-server is running on port " + port);
  process.exit(0);
}

main().catch(err => {
  console.error("Error during execution:", err);
  process.exit(1);
});
