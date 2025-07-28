import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface CategoryBudget {
  category: string;
  monthlyBudget: number;
}

export interface Config {
  database?: {
    path?: string;
  };
  display?: {
    currencySymbol?: string;
    dateFormat?: string;
  };
  categories?: string[];
  budget?: {
    cycleStartDay?: number;
    categoryBudgets?: CategoryBudget[];
  };
}

/**
 * Loads the configuration from a YAML file.
 * @param {string} [configPath] - The path to the configuration file. Defaults to ~/.purse.yml.
 * @returns {{config: Config, filePath: string}} The loaded configuration and the file path.
 */
export function loadConfig(configPath?: string): {
  config: Config;
  filePath: string;
} {
  const defaultConfigPath = path.join(process.env.HOME || '', '.purse.yml');
  const finalConfigPath = configPath || defaultConfigPath;

  if (fs.existsSync(finalConfigPath)) {
    try {
      const fileContents = fs.readFileSync(finalConfigPath, 'utf8');
      return {
        config: yaml.load(fileContents) as Config,
        filePath: finalConfigPath,
      };
    } catch (e) {
      console.error(`Error loading config file ${finalConfigPath}:`, e);
      return { config: {}, filePath: finalConfigPath };
    }
  } else {
    console.log(
      `Config file not found at ${finalConfigPath}. Creating a new one.`
    );
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

/**
 * Gets the current budget cycle start date based on the configured cycle day.
 * @param {number} cycleStartDay - The day of the month when the cycle starts (default: 1).
 * @returns {Date} The start date of the current budget cycle.
 */
export function getCurrentBudgetCycleStart(cycleStartDay: number = 1): Date {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentDay = today.getDate();

  if (currentDay >= cycleStartDay) {
    return new Date(currentYear, currentMonth, cycleStartDay);
  } else {
    return new Date(currentYear, currentMonth - 1, cycleStartDay);
  }
}

/**
 * Gets the end date of the current budget cycle.
 * @param {number} cycleStartDay - The day of the month when the cycle starts (default: 1).
 * @returns {Date} The end date of the current budget cycle.
 */
export function getCurrentBudgetCycleEnd(cycleStartDay: number = 1): Date {
  const cycleStart = getCurrentBudgetCycleStart(cycleStartDay);
  const nextMonth = new Date(cycleStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(nextMonth.getDate() - 1);
  return nextMonth;
}

/**
 * Gets the budget for a specific category.
 * @param {Config} config - The configuration object.
 * @param {string} category - The category name.
 * @returns {number} The monthly budget amount for the category (0 if not found).
 */
export function getCategoryBudget(config: Config, category: string): number {
  const budgets = config.budget?.categoryBudgets || [];
  const budget = budgets.find((b) => b.category === category);
  return budget?.monthlyBudget || 0;
}

/**
 * Sets the budget for a specific category.
 * @param {Config} config - The configuration object.
 * @param {string} category - The category name.
 * @param {number} monthlyBudget - The monthly budget amount.
 */
export function setCategoryBudget(
  config: Config,
  category: string,
  monthlyBudget: number
): void {
  if (!config.budget) {
    config.budget = {};
  }
  if (!config.budget.categoryBudgets) {
    config.budget.categoryBudgets = [];
  }

  const budgets = config.budget.categoryBudgets;
  const existingIndex = budgets.findIndex((b) => b.category === category);

  if (existingIndex >= 0) {
    budgets[existingIndex]!.monthlyBudget = monthlyBudget;
  } else {
    budgets.push({ category, monthlyBudget });
  }
}
