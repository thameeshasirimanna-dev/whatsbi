const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Load .env file from the workspace root if it exists
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        // Remove quotes if present
        if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
          value = value.substring(1, value.length - 1);
        } else if (value.length > 0 && value.charAt(0) === "'" && value.charAt(value.length - 1) === "'") {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value.trim();
        }
      }
    });
  }
} catch (error) {
  console.error(`Failed to load .env file: ${error.message}`);
}

const apiKey = process.env.STITCH_API_KEY;
if (!apiKey) {
  console.error('Error: STITCH_API_KEY environment variable is not set. Please set it or add it to your local .env file.');
  process.exit(1);
}

const remoteUrl = 'https://stitch.googleapis.com/mcp';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', async (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    
    // Forward the request to the remote Stitch server
    const response = await fetch(remoteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey
      },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Remote server returned HTTP ${response.status}: ${errorText}`);
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id || null,
        error: {
          code: -32603,
          message: `Remote server returned HTTP ${response.status}`
        }
      }));
      return;
    }
    
    const responseData = await response.json();
    
    // If the request was for tools/list, fix the broken schema reference
    if (request.method === 'tools/list' && responseData.result && Array.isArray(responseData.result.tools)) {
      for (const tool of responseData.result.tools) {
        if (tool.name === 'upload_design_md') {
          if (tool.outputSchema && tool.outputSchema.properties && tool.outputSchema.properties.variantScreenInstance) {
            // Fix the broken recursive ref #/$defs/ScreenInstance to refer to the root schema #
            tool.outputSchema.properties.variantScreenInstance = {
              $ref: '#',
              description: 'Optional. The variant Screen Instance.'
            };
          }
        }
      }
    }
    
    // Send response back via stdout (terminated by newline)
    console.log(JSON.stringify(responseData));
  } catch (error) {
    console.error(`Proxy error: ${error.stack}`);
    console.log(JSON.stringify({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32603,
        message: `Internal proxy error: ${error.message}`
      }
    }));
  }
});
