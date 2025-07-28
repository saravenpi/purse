import {
  expect,
  test,
  describe,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import {
  addTransaction,
  getTransactions,
  clearTransactions,
  deleteTransaction,
  editTransaction,
  getBudgetUsage,
  getSavingsStats,
  getSavingsTransactions,
} from '../src/data';
import {
  loadConfig,
  saveConfig,
  type Config,
  getCategoryBudget,
  setCategoryBudget,
  getCurrentBudgetCycleStart,
  getCurrentBudgetCycleEnd,
  getSavingsGoal,
  setSavingsGoal,
  removeSavingsGoal,
} from '../src/config';
// Functions for testing command logic
function handleAddAction(
  options: { amount: number; description: string; category?: string; isSavings?: boolean },
  config: Config
) {
  const dbPath = config.database?.path || '~/.purse_data.json';
  if (
    options.category &&
    config.categories &&
    !config.categories.includes(options.category)
  ) {
    console.log(
      `Warning: Category '${options.category}' is not defined in your config file. Consider adding it.`
    );
  }
  addTransaction(dbPath, options.amount, options.description, options.category, options.isSavings);
}

function handleCategoryAddAction(categoryName: string, configPath: string) {
  const { config } = loadConfig(configPath);
  config.categories = config.categories || [];
  if (config.categories.includes(categoryName)) {
    console.log(`Category '${categoryName}' already exists.`);
  } else {
    config.categories.push(categoryName);
    saveConfig(config, configPath);
    console.log(`Category '${categoryName}' added.`);
  }
}

function handleCategoryEditAction(
  oldName: string,
  newName: string,
  configPath: string
) {
  const { config } = loadConfig(configPath);
  config.categories = config.categories || [];
  const index = config.categories.indexOf(oldName);
  if (index === -1) {
    console.log(`Category '${oldName}' not found.`);
  } else {
    config.categories[index] = newName;
    saveConfig(config, configPath);
    console.log(`Category '${oldName}' renamed to '${newName}'.`);
  }
}

function handleCategoryDeleteAction(categoryName: string, configPath: string) {
  const { config } = loadConfig(configPath);
  config.categories = config.categories || [];
  if (!config.categories.includes(categoryName)) {
    console.log(`Category '${categoryName}' not found.`);
  } else {
    config.categories = config.categories.filter((cat) => cat !== categoryName);
    saveConfig(config, configPath);
    console.log(`Category '${categoryName}' deleted.`);
  }
}

const TEST_DB_PATH = path.resolve(__dirname, './test_data.json');
const TEST_CONFIG_PATH = path.resolve(__dirname, './test_config.yml');
const TEST_CONFIG_CUSTOM_DISPLAY_PATH = path.resolve(
  __dirname,
  './test_config_custom_display.yml'
);
const TEST_CONFIG_CATEGORIES_PATH = path.resolve(
  __dirname,
  './test_config_categories.yml'
);

describe('Purse Core Logic', () => {
  let consoleOutput: string[] = [];
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeAll(() => {
    // Ensure the test data directory exists
    const testDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // Create test config files
    fs.writeFileSync(TEST_CONFIG_PATH, `database:\n  path: ${TEST_DB_PATH}\n`);
    fs.writeFileSync(
      TEST_CONFIG_CUSTOM_DISPLAY_PATH,
      `database:\n  path: ${TEST_DB_PATH}\ndisplay:\n  currencySymbol: '€'\n  dateFormat: 'fr-FR'\n`
    );
    fs.writeFileSync(
      TEST_CONFIG_CATEGORIES_PATH,
      `database:\n  path: ${TEST_DB_PATH}\ncategories:\n  - Food\n  - Transport\n  - Salary\n`
    );
  });

  beforeEach(() => {
    // Clean up test data before each test
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Mock console.log and console.warn
    consoleOutput = [];
    console.log = (...args: unknown[]) => {
      consoleOutput.push(args.join(' '));
    };
    console.warn = (...args: unknown[]) => {
      consoleOutput.push(args.join(' '));
    };
  });

  afterAll(() => {
    // Restore original console functions
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    // Clean up test data after all tests are done
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
    if (fs.existsSync(TEST_CONFIG_CUSTOM_DISPLAY_PATH)) {
      fs.unlinkSync(TEST_CONFIG_CUSTOM_DISPLAY_PATH);
    }
    if (fs.existsSync(TEST_CONFIG_CATEGORIES_PATH)) {
      fs.unlinkSync(TEST_CONFIG_CATEGORIES_PATH);
    }
  });

  test('should add a transaction with category', () => {
    const config: Config = loadConfig(TEST_CONFIG_CATEGORIES_PATH).config;
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');
    expect(consoleOutput).toContain('Transaction added successfully.');

    const data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(100);
    expect(data.transactions[0].description).toBe('Test Income');
    expect(data.transactions[0].category).toBe('Salary');
    expect(data.transactions[0].isSavings).toBeUndefined();
  });

  test('should add a savings transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_CATEGORIES_PATH).config;
    addTransaction(config.database!.path!, 200, 'Emergency Fund', 'Savings', true);
    expect(consoleOutput).toContain('Transaction added successfully.');

    const data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(200);
    expect(data.transactions[0].description).toBe('Emergency Fund');
    expect(data.transactions[0].category).toBe('Savings');
    expect(data.transactions[0].isSavings).toBe(true);
  });

  test('should warn when adding a transaction with an undefined category', () => {
    const config: Config = loadConfig(TEST_CONFIG_CATEGORIES_PATH).config;

    // Directly call the extracted action logic
    handleAddAction(
      { amount: 50, description: 'Undefined Category', category: 'Undefined' },
      config
    );

    expect(consoleOutput).toContain(
      "Warning: Category 'Undefined' is not defined in your config file. Consider adding it."
    );
    expect(consoleOutput).toContain('Transaction added successfully.');
  });

  test('should list transactions with category and default display', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');

    // Manually call the list logic
    const transactions = getTransactions(config.database!.path!);
    const currencySymbol = config.display?.currencySymbol || '$';
    const dateFormat = config.display?.dateFormat || 'en-US';

    let output = 'Transactions:\n';
    transactions.forEach((tx) => {
      const date = new Date(tx.date).toLocaleString(dateFormat);
      const category = tx.category ? ` (Category: ${tx.category})` : '';
      output += `  ID: ${tx.id}, Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}\n`;
    });

    expect(output).toContain('Transactions:');
    expect(output).toContain(
      'Amount: $100.00, Description: Test Income (Category: Salary)'
    );
  });

  test('should display correct balance with default currency', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(config.database!.path!, 100, 'Test Income');

    const transactions = getTransactions(config.database!.path!);
    const currencySymbol = config.display?.currencySymbol || '$';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain(
      'Current Balance: $100.00'
    );
  });

  test('should list transactions with custom display options', () => {
    const config: Config = loadConfig(TEST_CONFIG_CUSTOM_DISPLAY_PATH).config;
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');
    addTransaction(config.database!.path!, 20, 'Coffee', 'Food');

    const transactions = getTransactions(config.database!.path!);
    const currencySymbol = config.display?.currencySymbol || '€';
    const dateFormat = config.display?.dateFormat || 'fr-FR';

    let output = 'Transactions:\n';
    transactions.forEach((tx) => {
      const date = new Date(tx.date).toLocaleString(dateFormat);
      const category = tx.category ? ` (Category: ${tx.category})` : '';
      output += `  ID: ${tx.id}, Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}\n`;
    });

    expect(output).toContain('Transactions:');
    expect(output).toContain(
      'Amount: €100.00, Description: Test Income (Category: Salary)'
    );
    expect(output).toContain(
      'Amount: €20.00, Description: Coffee (Category: Food)'
    );
  });

  test('should display correct balance with custom currency', () => {
    const config: Config = loadConfig(TEST_CONFIG_CUSTOM_DISPLAY_PATH).config;
    addTransaction(config.database!.path!, 100, 'Test Income');
    addTransaction(config.database!.path!, 20, 'Coffee');

    const transactions = getTransactions(config.database!.path!);
    const currencySymbol = config.display?.currencySymbol || '€';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain(
      'Current Balance: €120.00'
    );
  });

  test('should set balance and clear previous transactions', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(config.database!.path!, 100, 'Old Transaction');
    let data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);

    clearTransactions(config.database!.path!); // Call clear directly
    addTransaction(config.database!.path!, 500, 'Initial Balance', 'System'); // Call add directly
    expect(consoleOutput).toContain('All transactions cleared.');
    expect(consoleOutput).toContain('Transaction added successfully.');

    data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(500);
    expect(data.transactions[0].description).toBe('Initial Balance');
  });

  test('should update balance by adding a new transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(config.database!.path!, 100, 'Initial Balance');
    addTransaction(config.database!.path!, 50, 'Income Adjustment', 'Salary');
    expect(consoleOutput).toContain('Transaction added successfully.');

    const transactions = getTransactions(config.database!.path!);
    const currencySymbol = config.display?.currencySymbol || '$';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain(
      'Current Balance: $150.00'
    );

    const data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[1].amount).toBe(50);
    expect(data.transactions[1].description).toBe('Income Adjustment');
    expect(data.transactions[1].category).toBe('Salary');
  });

  test('should delete a transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(config.database!.path!, 100, 'To be deleted');
    let data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    const transactionId = data.transactions[0].id;

    deleteTransaction(config.database!.path!, transactionId);
    expect(consoleOutput).toContain(
      `Transaction with ID ${transactionId} deleted successfully.`
    );

    data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(0);
  });

  test('should not delete a non-existent transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    deleteTransaction(config.database!.path!, 'non-existent-id');
    expect(consoleOutput).toContain(
      'Transaction with ID non-existent-id not found.'
    );
  });

  test('should edit a transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    addTransaction(
      config.database!.path!,
      100,
      'Original Description',
      'Original Category'
    );
    let data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    const transactionId = data.transactions[0].id;

    editTransaction(config.database!.path!, transactionId, {
      amount: 150,
      description: 'Edited Description',
      category: 'Edited Category',
    });
    expect(consoleOutput).toContain(
      `Transaction with ID ${transactionId} updated successfully.`
    );

    data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(150);
    expect(data.transactions[0].description).toBe('Edited Description');
    expect(data.transactions[0].category).toBe('Edited Category');
  });

  test('should not edit a non-existent transaction', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH).config;
    editTransaction(config.database!.path!, 'non-existent-id', { amount: 100 });
    expect(consoleOutput).toContain(
      'Transaction with ID non-existent-id not found.'
    );
  });

  describe('Category Management', () => {
    test('should add a new category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = []; // Ensure categories are empty for this test
      saveConfig(config, filePath);
      consoleOutput = []; // Clear console output after saving config

      // Simulate category add action
      handleCategoryAddAction('NewCategory', TEST_CONFIG_PATH);

      expect(consoleOutput).toContain(`Category 'NewCategory' added.`);

      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).toContain('NewCategory');
    });

    test('should not add a duplicate category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = ['ExistingCategory'];
      saveConfig(config, filePath);
      consoleOutput = [];

      // Simulate category add action
      handleCategoryAddAction('ExistingCategory', TEST_CONFIG_PATH);

      expect(consoleOutput).toContain(
        `Category 'ExistingCategory' already exists.`
      );
      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).toHaveLength(1);
    });

    test('should edit an existing category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = ['OldCategory'];
      saveConfig(config, filePath);
      consoleOutput = [];

      // Simulate category edit action
      handleCategoryEditAction(
        'OldCategory',
        'UpdatedCategory',
        TEST_CONFIG_PATH
      );

      expect(consoleOutput).toContain(
        `Category 'OldCategory' renamed to 'UpdatedCategory'.`
      );

      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).toContain('UpdatedCategory');
      expect(loadedConfig.categories).not.toContain('OldCategory');
    });

    test('should not edit a non-existent category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = ['ExistingCategory'];
      saveConfig(config, filePath);
      consoleOutput = [];

      // Simulate category edit action
      handleCategoryEditAction(
        'NonExistentCategory',
        'UpdatedCategory',
        TEST_CONFIG_PATH
      );

      expect(consoleOutput).toContain(
        `Category 'NonExistentCategory' not found.`
      );
      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).toHaveLength(1);
      expect(loadedConfig.categories).toContain('ExistingCategory');
    });

    test('should delete a category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = ['CategoryToDelete', 'AnotherCategory'];
      saveConfig(config, filePath);
      consoleOutput = [];

      // Simulate category delete action
      handleCategoryDeleteAction('CategoryToDelete', TEST_CONFIG_PATH);

      expect(consoleOutput).toContain(`Category 'CategoryToDelete' deleted.`);

      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).not.toContain('CategoryToDelete');
      expect(loadedConfig.categories).toHaveLength(1);
    });

    test('should not delete a non-existent category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      config.categories = ['ExistingCategory'];
      saveConfig(config, filePath);
      consoleOutput = [];

      // Simulate category delete action
      handleCategoryDeleteAction('NonExistentCategory', TEST_CONFIG_PATH);

      expect(consoleOutput).toContain(
        `Category 'NonExistentCategory' not found.`
      );
      const loadedConfig = loadConfig(filePath).config;
      expect(loadedConfig.categories).toHaveLength(1);
      expect(loadedConfig.categories).toContain('ExistingCategory');
    });
  });

  describe('Budget Management', () => {
    const TEST_CONFIG_BUDGET_PATH = path.resolve(
      __dirname,
      './test_config_budget.yml'
    );

    beforeEach(() => {
      fs.writeFileSync(
        TEST_CONFIG_BUDGET_PATH,
        `database:
  path: ${TEST_DB_PATH}
categories:
  - Food
  - Transport  
  - Entertainment
budget:
  cycleStartDay: 1
  categoryBudgets:
    - category: Food
      monthlyBudget: 500
    - category: Transport
      monthlyBudget: 200`
      );
    });

    afterEach(() => {
      if (fs.existsSync(TEST_CONFIG_BUDGET_PATH)) {
        fs.unlinkSync(TEST_CONFIG_BUDGET_PATH);
      }
    });

    test('should get category budget', () => {
      const { config } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      expect(getCategoryBudget(config, 'Food')).toBe(500);
      expect(getCategoryBudget(config, 'Transport')).toBe(200);
      expect(getCategoryBudget(config, 'Entertainment')).toBe(0);
      expect(getCategoryBudget(config, 'NonExistent')).toBe(0);
    });

    test('should set category budget for new category', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      setCategoryBudget(config, 'Entertainment', 300);
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      expect(getCategoryBudget(updatedConfig, 'Entertainment')).toBe(300);
      expect(updatedConfig.budget?.categoryBudgets).toHaveLength(3);
    });

    test('should update existing category budget', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      setCategoryBudget(config, 'Food', 600);
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      expect(getCategoryBudget(updatedConfig, 'Food')).toBe(600);
      expect(updatedConfig.budget?.categoryBudgets).toHaveLength(2);
    });

    test('should get current budget cycle dates', () => {
      const cycleStart = getCurrentBudgetCycleStart(1);
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      
      expect(cycleStart).toBeInstanceOf(Date);
      expect(cycleEnd).toBeInstanceOf(Date);
      expect(cycleEnd.getTime()).toBeGreaterThan(cycleStart.getTime());
      
      // Cycle should be approximately 1 month
      const diffInDays = (cycleEnd.getTime() - cycleStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffInDays).toBeGreaterThan(27);
      expect(diffInDays).toBeLessThan(32);
    });

    test('should get current budget cycle dates with custom start day', () => {
      const cycleStart15 = getCurrentBudgetCycleStart(15);
      const cycleEnd15 = getCurrentBudgetCycleEnd(15);
      
      expect(cycleStart15.getDate()).toBe(15);
      expect(cycleEnd15.getDate()).toBe(14);
    });

    test('should calculate budget usage correctly', () => {
      const { config } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      // Add some test transactions within current cycle
      const cycleStart = getCurrentBudgetCycleStart(1);
      const testDate = new Date(cycleStart.getTime() + 86400000); // 1 day after cycle start
      
      // Create transactions with specific dates
      const transactions = [
        {
          id: '1',
          amount: -100,
          description: 'Groceries',
          category: 'Food',
          date: testDate.toISOString(),
        },
        {
          id: '2',
          amount: -50,
          description: 'Bus fare',
          category: 'Transport',
          date: testDate.toISOString(),
        },
        {
          id: '3',
          amount: -200,
          description: 'More groceries',
          category: 'Food',
          date: testDate.toISOString(),
        },
      ];
      
      // Write test transactions to file
      fs.writeFileSync(TEST_DB_PATH, JSON.stringify({ transactions }));
      
      const budgets = config.budget?.categoryBudgets || [];
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      expect(budgetUsage).toHaveLength(2);
      
      const foodUsage = budgetUsage.find(usage => usage.category === 'Food');
      const transportUsage = budgetUsage.find(usage => usage.category === 'Transport');
      
      expect(foodUsage).toBeDefined();
      expect(foodUsage?.budget).toBe(500);
      expect(foodUsage?.spent).toBe(300); // 100 + 200
      expect(foodUsage?.remaining).toBe(200); // 500 - 300
      expect(foodUsage?.percentage).toBe(60); // 300/500 * 100
      
      expect(transportUsage).toBeDefined();
      expect(transportUsage?.budget).toBe(200);
      expect(transportUsage?.spent).toBe(50);
      expect(transportUsage?.remaining).toBe(150);
      expect(transportUsage?.percentage).toBe(25);
    });

    test('should handle over-budget scenarios', () => {
      const { config } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      const cycleStart = getCurrentBudgetCycleStart(1);
      const testDate = new Date(cycleStart.getTime() + 86400000);
      
      // Create transactions that exceed budget
      const transactions = [
        {
          id: '1',
          amount: -600, // Exceeds Food budget of 500
          description: 'Expensive groceries',
          category: 'Food',
          date: testDate.toISOString(),
        },
      ];
      
      fs.writeFileSync(TEST_DB_PATH, JSON.stringify({ transactions }));
      
      const budgets = config.budget?.categoryBudgets || [];
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      const foodUsage = budgetUsage.find(usage => usage.category === 'Food');
      
      expect(foodUsage?.budget).toBe(500);
      expect(foodUsage?.spent).toBe(600);
      expect(foodUsage?.remaining).toBe(0); // Max of 0 and (500-600)
      expect(foodUsage?.percentage).toBe(120); // 600/500 * 100
    });

    test('should only include expenses in budget calculations', () => {
      const { config } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      const cycleStart = getCurrentBudgetCycleStart(1);
      const testDate = new Date(cycleStart.getTime() + 86400000);
      
      // Mix of income and expenses
      const transactions = [
        {
          id: '1',
          amount: -100,
          description: 'Food expense',
          category: 'Food',
          date: testDate.toISOString(),
        },
        {
          id: '2',
          amount: 500, // Income - should not count towards budget
          description: 'Food refund',
          category: 'Food',
          date: testDate.toISOString(),
        },
      ];
      
      fs.writeFileSync(TEST_DB_PATH, JSON.stringify({ transactions }));
      
      const budgets = config.budget?.categoryBudgets || [];
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      const foodUsage = budgetUsage.find(usage => usage.category === 'Food');
      
      // Should only count the expense, not the income
      expect(foodUsage?.spent).toBe(100);
      expect(foodUsage?.percentage).toBe(20); // 100/500 * 100
    });

    test('should handle transactions outside budget cycle', () => {
      const { config } = loadConfig(TEST_CONFIG_BUDGET_PATH);
      
      const cycleStart = getCurrentBudgetCycleStart(1);
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      
      // Create transactions outside the current cycle
      const oldDate = new Date(cycleStart.getTime() - 86400000); // 1 day before cycle
      const futureDate = new Date(cycleEnd.getTime() + 86400000); // 1 day after cycle
      const inCycleDate = new Date(cycleStart.getTime() + 86400000); // In cycle
      
      const transactions = [
        {
          id: '1',
          amount: -200,
          description: 'Old expense',
          category: 'Food',
          date: oldDate.toISOString(),
        },
        {
          id: '2',
          amount: -100,
          description: 'Current expense',
          category: 'Food',
          date: inCycleDate.toISOString(),
        },
        {
          id: '3',
          amount: -300,
          description: 'Future expense',
          category: 'Food',
          date: futureDate.toISOString(),
        },
      ];
      
      fs.writeFileSync(TEST_DB_PATH, JSON.stringify({ transactions }));
      
      const budgets = config.budget?.categoryBudgets || [];
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      const foodUsage = budgetUsage.find(usage => usage.category === 'Food');
      
      // Should only count the in-cycle transaction
      expect(foodUsage?.spent).toBe(100);
    });

    test('should handle categories without budgets', () => {
      const budgets: { category: string; monthlyBudget: number }[] = [];
      const cycleStart = getCurrentBudgetCycleStart(1);
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      expect(budgetUsage).toHaveLength(0);
    });

    test('should initialize budget config when not present', () => {
      const config: Config = { categories: ['Test'] };
      
      setCategoryBudget(config, 'Test', 100);
      
      expect(config.budget).toBeDefined();
      expect(config.budget?.categoryBudgets).toBeDefined();
      expect(config.budget?.categoryBudgets).toHaveLength(1);
      expect(config.budget?.categoryBudgets?.[0]?.category).toBe('Test');
      expect(config.budget?.categoryBudgets?.[0]?.monthlyBudget).toBe(100);
    });
  });

  describe('Budget CLI Commands', () => {
    const TEST_CONFIG_CLI_PATH = path.resolve(
      __dirname,
      './test_config_cli.yml'
    );

    beforeEach(() => {
      fs.writeFileSync(
        TEST_CONFIG_CLI_PATH,
        `database:
  path: ${TEST_DB_PATH}
categories:
  - Food
  - Transport
budget:
  cycleStartDay: 1
  categoryBudgets:
    - category: Food
      monthlyBudget: 400`
      );
    });

    afterEach(() => {
      if (fs.existsSync(TEST_CONFIG_CLI_PATH)) {
        fs.unlinkSync(TEST_CONFIG_CLI_PATH);
      }
    });

    test('should set budget via CLI-like function', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_CLI_PATH);
      
      // Simulate budget set command
      setCategoryBudget(config, 'Transport', 150);
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      expect(getCategoryBudget(updatedConfig, 'Transport')).toBe(150);
      expect(getCategoryBudget(updatedConfig, 'Food')).toBe(400); // Should remain unchanged
    });

    test('should handle cycle day setting', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_CLI_PATH);
      
      // Set custom cycle day
      if (!config.budget) config.budget = {};
      config.budget.cycleStartDay = 15;
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      expect(updatedConfig.budget?.cycleStartDay).toBe(15);
      
      // Test that cycle dates use the custom day
      const cycleStart = getCurrentBudgetCycleStart(15);
      expect(cycleStart.getDate()).toBe(15);
    });

    test('should list budgets correctly', () => {
      const { config } = loadConfig(TEST_CONFIG_CLI_PATH);
      
      const budgets = config.budget?.categoryBudgets || [];
      expect(budgets).toHaveLength(1);
      expect(budgets[0]?.category).toBe('Food');
      expect(budgets[0]?.monthlyBudget).toBe(400);
    });

    test('should handle budget status calculation for CLI', () => {
      const { config } = loadConfig(TEST_CONFIG_CLI_PATH);
      
      // Add test transactions
      const cycleStart = getCurrentBudgetCycleStart(1);
      const testDate = new Date(cycleStart.getTime() + 86400000);
      
      const transactions = [
        {
          id: '1',
          amount: -200,
          description: 'Groceries',
          category: 'Food',
          date: testDate.toISOString(),
        },
      ];
      
      fs.writeFileSync(TEST_DB_PATH, JSON.stringify({ transactions }));
      
      const budgets = config.budget?.categoryBudgets || [];
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgetUsage = getBudgetUsage(TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      expect(budgetUsage).toHaveLength(1);
      const foodUsage = budgetUsage[0];
      expect(foodUsage).toBeDefined();
      expect(foodUsage!.category).toBe('Food');
      expect(foodUsage!.budget).toBe(400);
      expect(foodUsage!.spent).toBe(200);
      expect(foodUsage!.remaining).toBe(200);
      expect(foodUsage!.percentage).toBe(50);
    });

    test('should validate budget inputs', () => {
      const { config } = loadConfig(TEST_CONFIG_CLI_PATH);
      
      // Test setting negative budget (should work but unusual)
      setCategoryBudget(config, 'Test', -100);
      expect(getCategoryBudget(config, 'Test')).toBe(-100);
      
      // Test setting zero budget
      setCategoryBudget(config, 'Test', 0);
      expect(getCategoryBudget(config, 'Test')).toBe(0);
      
      // Test setting decimal budget
      setCategoryBudget(config, 'Test', 99.99);
      expect(getCategoryBudget(config, 'Test')).toBe(99.99);
    });
  });

  describe('Integration Tests', () => {
    test('should handle complete budget workflow', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      
      // 1. Add categories
      config.categories = ['Food', 'Transport', 'Entertainment'];
      
      // 2. Set budgets
      setCategoryBudget(config, 'Food', 500);
      setCategoryBudget(config, 'Transport', 200);
      // Entertainment deliberately left without budget
      
      // 3. Set cycle day
      if (!config.budget) config.budget = {};
      config.budget.cycleStartDay = 5;
      
      saveConfig(config, filePath);
      
      // 4. Add transactions
      addTransaction(config.database?.path || TEST_DB_PATH, -150, 'Groceries', 'Food');
      addTransaction(config.database?.path || TEST_DB_PATH, -50, 'Bus pass', 'Transport');
      addTransaction(config.database?.path || TEST_DB_PATH, -30, 'Movie ticket', 'Entertainment');
      
      // 5. Verify budget calculations
      const cycleStart = getCurrentBudgetCycleStart(5);
      const cycleEnd = getCurrentBudgetCycleEnd(5);
      const budgets = config.budget.categoryBudgets || [];
      const budgetUsage = getBudgetUsage(config.database?.path || TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      expect(budgetUsage).toHaveLength(2); // Only Food and Transport have budgets
      
      const foodUsage = budgetUsage.find(u => u.category === 'Food');
      const transportUsage = budgetUsage.find(u => u.category === 'Transport');
      
      expect(foodUsage?.spent).toBe(150);
      expect(foodUsage?.remaining).toBe(350);
      expect(transportUsage?.spent).toBe(50);
      expect(transportUsage?.remaining).toBe(150);
      
      // 6. Verify config persistence
      const reloadedConfig = loadConfig(filePath).config;
      expect(reloadedConfig.budget?.cycleStartDay).toBe(5);
      expect(getCategoryBudget(reloadedConfig, 'Food')).toBe(500);
      expect(getCategoryBudget(reloadedConfig, 'Entertainment')).toBe(0);
    });

    test('should handle budget overspending gracefully', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      
      setCategoryBudget(config, 'Food', 100);
      saveConfig(config, filePath);
      
      // Add transaction that exceeds budget
      addTransaction(config.database?.path || TEST_DB_PATH, -150, 'Expensive groceries', 'Food');
      
      const cycleStart = getCurrentBudgetCycleStart(1);
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgets = config.budget?.categoryBudgets || [];
      const budgetUsage = getBudgetUsage(config.database?.path || TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      const foodUsage = budgetUsage[0];
      expect(foodUsage).toBeDefined();
      expect(foodUsage!.spent).toBe(150);
      expect(foodUsage!.remaining).toBe(0);
      expect(foodUsage!.percentage).toBe(150);
    });
  });

  describe('Savings Management', () => {
    const TEST_CONFIG_SAVINGS_PATH = path.resolve(
      __dirname,
      './test_config_savings.yml'
    );

    beforeEach(() => {
      fs.writeFileSync(
        TEST_CONFIG_SAVINGS_PATH,
        `database:
  path: ${TEST_DB_PATH}
categories:
  - Savings
  - Emergency
savings:
  goals:
    - name: Emergency Fund
      target: 10000
      priority: high
    - name: Vacation
      target: 5000
      priority: medium`
      );
    });

    afterEach(() => {
      if (fs.existsSync(TEST_CONFIG_SAVINGS_PATH)) {
        fs.unlinkSync(TEST_CONFIG_SAVINGS_PATH);
      }
    });

    test('should get savings goal', () => {
      const { config } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      const emergencyGoal = getSavingsGoal(config, 'Emergency Fund');
      expect(emergencyGoal).toBeDefined();
      expect(emergencyGoal?.target).toBe(10000);
      expect(emergencyGoal?.priority).toBe('high');
      
      const nonExistentGoal = getSavingsGoal(config, 'NonExistent');
      expect(nonExistentGoal).toBeUndefined();
    });

    test('should set new savings goal', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      setSavingsGoal(config, 'Car Fund', 15000, 'low', '2025-12-31');
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      const carGoal = getSavingsGoal(updatedConfig, 'Car Fund');
      expect(carGoal).toBeDefined();
      expect(carGoal?.target).toBe(15000);
      expect(carGoal?.priority).toBe('low');
      expect(carGoal?.deadline).toBe('2025-12-31');
      expect(updatedConfig.savings?.goals).toHaveLength(3);
    });

    test('should update existing savings goal', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      setSavingsGoal(config, 'Emergency Fund', 12000, 'high');
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      const emergencyGoal = getSavingsGoal(updatedConfig, 'Emergency Fund');
      expect(emergencyGoal?.target).toBe(12000);
      expect(updatedConfig.savings?.goals).toHaveLength(2);
    });

    test('should remove savings goal', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      const removed = removeSavingsGoal(config, 'Vacation');
      expect(removed).toBe(true);
      saveConfig(config, filePath);
      
      const updatedConfig = loadConfig(filePath).config;
      expect(getSavingsGoal(updatedConfig, 'Vacation')).toBeUndefined();
      expect(updatedConfig.savings?.goals).toHaveLength(1);
      
      const notRemoved = removeSavingsGoal(config, 'NonExistent');
      expect(notRemoved).toBe(false);
    });

    test('should get savings statistics', () => {
      const { config } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      // Add test savings transactions
      addTransaction(config.database!.path!, 500, 'Emergency savings', 'Savings', true);
      addTransaction(config.database!.path!, 300, 'Monthly savings', 'Savings', true);
      addTransaction(config.database!.path!, 200, 'Bonus savings', 'Savings', true);
      addTransaction(config.database!.path!, -50, 'Regular expense', 'Food'); // Non-savings
      
      const stats = getSavingsStats(config.database!.path!);
      
      expect(stats.totalSavings).toBe(1000);
      expect(stats.savingsTransactionCount).toBe(3);
      expect(stats.averageSavingsTransaction).toBe(1000 / 3);
    });

    test('should get savings transactions', () => {
      const { config } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      addTransaction(config.database!.path!, 500, 'Emergency savings', 'Savings', true);
      addTransaction(config.database!.path!, 300, 'Monthly savings', 'Savings', true);
      addTransaction(config.database!.path!, -50, 'Regular expense', 'Food'); // Non-savings
      
      const savingsTransactions = getSavingsTransactions(config.database!.path!);
      
      expect(savingsTransactions).toHaveLength(2);
      expect(savingsTransactions[0]?.isSavings).toBe(true);
      expect(savingsTransactions[1]?.isSavings).toBe(true);
      // Check that all amounts are present, order may vary due to timestamp precision
      const amounts = savingsTransactions.map(tx => tx.amount).sort();
      expect(amounts).toEqual([300, 500]);
    });

    test('should filter savings transactions by date range', () => {
      const { config } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 86400000);
      
      // Manually create transactions with specific dates
      const transactions = [
        {
          id: '1',
          amount: 500,
          description: 'Old savings',
          category: 'Savings',
          isSavings: true,
          date: yesterday.toISOString(),
        },
        {
          id: '2',
          amount: 300,
          description: 'Today savings',
          category: 'Savings',
          isSavings: true,
          date: now.toISOString(),
        },
      ];
      
      fs.writeFileSync(config.database!.path!, JSON.stringify({ transactions }));
      
      const todayOnwards = getSavingsTransactions(config.database!.path!, now);
      expect(todayOnwards).toHaveLength(1);
      expect(todayOnwards[0]!.description).toBe('Today savings');
      
      const upToToday = getSavingsTransactions(config.database!.path!, undefined, now);
      expect(upToToday).toHaveLength(2);
    });

    test('should handle budget calculations excluding savings', () => {
      const { config } = loadConfig(TEST_CONFIG_SAVINGS_PATH);
      
      const cycleStart = getCurrentBudgetCycleStart(1);
      const testDate = new Date(cycleStart.getTime() + 86400000);
      
      const transactions = [
        {
          id: '1',
          amount: -200,
          description: 'Food expense',
          category: 'Food',
          date: testDate.toISOString(),
        },
        {
          id: '2',
          amount: 500,
          description: 'Savings',
          category: 'Savings',
          isSavings: true,
          date: testDate.toISOString(),
        },
      ];
      
      fs.writeFileSync(config.database!.path!, JSON.stringify({ transactions }));
      
      // Set up budget for Food category
      const budgets = [{ category: 'Food', monthlyBudget: 300 }];
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgetUsage = getBudgetUsage(config.database!.path!, cycleStart, cycleEnd, budgets);
      
      expect(budgetUsage).toHaveLength(1);
      const foodUsage = budgetUsage[0];
      expect(foodUsage).toBeDefined();
      expect(foodUsage!.spent).toBe(200);
      expect(foodUsage!.remaining).toBe(100);
    });

    test('should initialize savings config when not present', () => {
      const config: Config = { categories: ['Test'] };
      
      setSavingsGoal(config, 'Test Goal', 1000, 'medium');
      
      expect(config.savings).toBeDefined();
      expect(config.savings?.goals).toBeDefined();
      expect(config.savings?.goals).toHaveLength(1);
      expect(config.savings?.goals?.[0]?.name).toBe('Test Goal');
      expect(config.savings?.goals?.[0]?.target).toBe(1000);
      expect(config.savings?.goals?.[0]?.priority).toBe('medium');
    });
  });

  describe('Integration Tests with Savings', () => {
    test('should handle complete financial workflow with savings', () => {
      const { config, filePath } = loadConfig(TEST_CONFIG_PATH);
      
      // 1. Add categories
      config.categories = ['Food', 'Salary', 'Savings'];
      
      // 2. Set budgets
      setCategoryBudget(config, 'Food', 500);
      
      // 3. Set savings goals
      setSavingsGoal(config, 'Emergency Fund', 10000, 'high');
      
      saveConfig(config, filePath);
      
      // 4. Add mixed transactions
      addTransaction(config.database?.path || TEST_DB_PATH, 2000, 'Salary', 'Salary');
      addTransaction(config.database?.path || TEST_DB_PATH, -150, 'Groceries', 'Food');
      addTransaction(config.database?.path || TEST_DB_PATH, 500, 'Emergency savings', 'Savings', true);
      
      // 5. Verify savings calculations
      const savingsStats = getSavingsStats(config.database?.path || TEST_DB_PATH);
      expect(savingsStats.totalSavings).toBe(500);
      expect(savingsStats.savingsTransactionCount).toBe(1);
      
      // 6. Verify budget calculations exclude savings
      const cycleStart = getCurrentBudgetCycleStart(1);
      const cycleEnd = getCurrentBudgetCycleEnd(1);
      const budgets = config.budget?.categoryBudgets || [];
      const budgetUsage = getBudgetUsage(config.database?.path || TEST_DB_PATH, cycleStart, cycleEnd, budgets);
      
      const foodUsage = budgetUsage.find(u => u.category === 'Food');
      expect(foodUsage?.spent).toBe(150); // Should not include savings
      
      // 7. Verify goal progress
      const emergencyGoal = getSavingsGoal(config, 'Emergency Fund');
      expect(emergencyGoal?.target).toBe(10000);
      const progress = (savingsStats.totalSavings / emergencyGoal!.target) * 100;
      expect(progress).toBe(5); // 500/10000 * 100
    });
  });
});
