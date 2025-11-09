import * as configManager from '../lib/configManager.js';

export function handler(argv) {
  const { action, key, value } = argv;

  if (action === 'get') {
    const config = configManager.getConfig();
    console.log('--- Current Configuration ---');
    console.log(JSON.stringify(config, null, 2));
  } 
  else if (action === 'set') {
    if (!key || value === undefined) {
      console.error('Error: You must provide a "key" and a "value" to set.');
      console.log('Example: queuectl config set max_retries 5');
      return;
    }
    configManager.setConfig(key, value);
  }
}