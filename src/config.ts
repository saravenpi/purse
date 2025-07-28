import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface Config {
  database?: {
    path?: string;
  };
}

/**
 * Loads the configuration from a YAML file.
 * @param {string} [configPath] - The path to the configuration file. Defaults to ~/.purse.yml.
 * @returns {Config} The loaded configuration.
 */
export function loadConfig(configPath?: string): Config {
  const defaultConfigPath = path.join(process.env.HOME || '', '.purse.yml');
  const finalConfigPath = configPath || defaultConfigPath;

  if (fs.existsSync(finalConfigPath)) {
    try {
      const fileContents = fs.readFileSync(finalConfigPath, 'utf8');
      return yaml.load(fileContents) as Config;
    } catch (e) {
      console.error(`Error loading config file ${finalConfigPath}:`, e);
      return {};
    }
  } else {
    console.log(`Config file not found at ${finalConfigPath}. Using default settings.`);
    return {};
  }
}