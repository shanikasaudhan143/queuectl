import fs from 'fs';
import path from 'path';

const configPath = path.join(process.cwd(), 'queue-config.json');

const DEFAULTS = {
  max_retries: 3,
  backoff_base: 2, // 2 seconds
};

export function getConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const configData = fs.readFileSync(configPath, 'utf8');
      return { ...DEFAULTS, ...JSON.parse(configData) };
    }
    return DEFAULTS;
  } catch (err) {
    console.error('Error reading config file:', err.message);
    return DEFAULTS;
  }
}

export function setConfig(key, value) {
  try {
    const currentConfig = getConfig();
    currentConfig[key] = value;
    
    // Convert value if it's a number
    if (!isNaN(Number(value))) {
        currentConfig[key] = Number(value);
    }
    
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));
    console.log(`Config updated: ${key} = ${currentConfig[key]}`);
  } catch (err) {
    console.error('Error writing config file:', err.message);
  }
}