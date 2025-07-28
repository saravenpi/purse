import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface Config {
  database?: {
    path?: string;
  };
  display?: {
    currencySymbol?: string;
    dateFormat?: string;
  };
  categories?: string[];
}

/**
 * Loads the configuration from a YAML file.
 * @param {string} [configPath] - The path to the configuration file. Defaults to ~/.purse.yml.
 * @returns {{config: Config, filePath: string}} The loaded configuration and the file path.
 */
export function loadConfig(configPath?: string): { config: Config, filePath: string } {
  const defaultConfigPath = path.join(process.env.HOME || '', '.purse.yml');
  const finalConfigPath = configPath || defaultConfigPath;

  if (fs.existsSync(finalConfigPath)) {
    try {
      const fileContents = fs.readFileSync(finalConfigPath, 'utf8');
      return { config: yaml.load(fileContents) as Config, filePath: finalConfigPath };
    } catch (e) {
      console.error(`Error loading config file ${finalConfigPath}:`, e);
      return { config: {}, filePath: finalConfigPath };
    }
  } else {
    console.log(`Config file not found at ${finalConfigPath}. Creating a new one.`);
    const newConfig: Config = { categories: [] }; // Initialize with empty categories
    saveConfig(newConfig, finalConfigPath);
    return { config: newConfig, filePath: finalConfigPath };
  }
}

/**
 * Saves the configuration to a YAML file.
 * @param {Config} config - The configuration object to save.
 * @param {string} filePath - The path to the configuration file.
 */
export function saveConfig(config: Config, filePath: string): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const yamlStr = yaml.dump(config);
    fs.writeFileSync(filePath, yamlStr, 'utf8');
  } catch (e) {
    console.error(`Error saving config file ${filePath}:`, e);
  }
}