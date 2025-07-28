import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';

export interface CategoryBudget {
  category: string;
  monthlyBudget: number;
}

export interface SavingsGoal {
  name: string;
  target: number;
  priority: 'low' | 'medium' | 'high';
  deadline?: string;
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
  savings?: {
    goals?: SavingsGoal[];
  };
}

/**
 * Loads the configuration from a YAML file.
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
    const newConfig: Config = { categories: [] };
    saveConfig(newConfig, finalConfigPath);
    return { config: newConfig, filePath: finalConfigPath };
  }
}

/**
 * Saves the configuration to a YAML file.
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
 */
export function getCategoryBudget(config: Config, category: string): number {
  const budgets = config.budget?.categoryBudgets || [];
  const budget = budgets.find((b) => b.category === category);
  return budget?.monthlyBudget || 0;
}

/**
 * Sets the budget for a specific category.
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

/**
 * Gets a savings goal by name.
 */
export function getSavingsGoal(config: Config, goalName: string): SavingsGoal | undefined {
  return config.savings?.goals?.find(goal => goal.name === goalName);
}

/**
 * Sets or updates a savings goal.
 */
export function setSavingsGoal(
  config: Config,
  goalName: string,
  target: number,
  priority: 'low' | 'medium' | 'high',
  deadline?: string
): void {
  if (!config.savings) {
    config.savings = {};
  }
  if (!config.savings.goals) {
    config.savings.goals = [];
  }

  const goals = config.savings.goals;
  const existingIndex = goals.findIndex(goal => goal.name === goalName);
  const newGoal: SavingsGoal = { name: goalName, target, priority, deadline };

  if (existingIndex >= 0) {
    goals[existingIndex] = newGoal;
  } else {
    goals.push(newGoal);
  }
}

/**
 * Removes a savings goal.
 */
export function removeSavingsGoal(config: Config, goalName: string): boolean {
  if (!config.savings?.goals) {
    return false;
  }

  const initialLength = config.savings.goals.length;
  config.savings.goals = config.savings.goals.filter(goal => goal.name !== goalName);
  return config.savings.goals.length < initialLength;
}
