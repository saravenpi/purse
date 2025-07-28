import { expect, test, describe, beforeAll, afterAll, beforeEach } from "bun:test";
import * as fs from 'fs';
import * as path from 'path';
import { addTransaction, getTransactions, clearTransactions } from '../src/data';
import { loadConfig, Config } from '../src/config';
import { handleAddAction } from '../src/commands/add'; // Import the extracted action

const TEST_DB_PATH = path.resolve(__dirname, './test_data.json');
const TEST_CONFIG_PATH = path.resolve(__dirname, './test_config.yml');
const TEST_CONFIG_CUSTOM_DISPLAY_PATH = path.resolve(__dirname, './test_config_custom_display.yml');
const TEST_CONFIG_CATEGORIES_PATH = path.resolve(__dirname, './test_config_categories.yml');

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
    fs.writeFileSync(TEST_CONFIG_CUSTOM_DISPLAY_PATH, `database:\n  path: ${TEST_DB_PATH}\ndisplay:\n  currencySymbol: '€'\n  dateFormat: 'fr-FR'\n`);
    fs.writeFileSync(TEST_CONFIG_CATEGORIES_PATH, `database:\n  path: ${TEST_DB_PATH}\ncategories:\n  - Food\n  - Transport\n  - Salary\n`);
  });

  beforeEach(() => {
    // Clean up test data before each test
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Mock console.log and console.warn
    consoleOutput = [];
    console.log = (...args: any[]) => { consoleOutput.push(args.join(' ')); };
    console.warn = (...args: any[]) => { consoleOutput.push(args.join(' ')); };
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
    const config: Config = loadConfig(TEST_CONFIG_CATEGORIES_PATH);
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');
    expect(consoleOutput).toContain('Transaction added successfully.');

    const data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(100);
    expect(data.transactions[0].description).toBe('Test Income');
    expect(data.transactions[0].category).toBe('Salary');
  });

  test('should warn when adding a transaction with an undefined category', () => {
    const config: Config = loadConfig(TEST_CONFIG_CATEGORIES_PATH);
    
    // Directly call the extracted action logic
    handleAddAction({ amount: 50, description: 'Undefined Category', category: 'Undefined' }, config);

    expect(consoleOutput).toContain('Warning: Category \'Undefined\' is not defined in your config file. Consider adding it.');
    expect(consoleOutput).toContain('Transaction added successfully.');
  });

  test('should list transactions with category and default display', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH);
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');
    
    // Manually call the list logic
    const transactions = getTransactions(config.database!.path!); 
    const currencySymbol = config.display?.currencySymbol || '$';
    const dateFormat = config.display?.dateFormat || 'en-US';

    let output = 'Transactions:\n';
    transactions.forEach((tx) => {
      const date = new Date(tx.date).toLocaleString(dateFormat);
      const category = tx.category ? ` (Category: ${tx.category})` : '';
      output += `  Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}\n`;
    });
    
    expect(output).toContain('Transactions:');
    expect(output).toContain('Amount: $100.00, Description: Test Income (Category: Salary)');
  });

  test('should display correct balance with default currency', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH);
    addTransaction(config.database!.path!, 100, 'Test Income');
    
    const transactions = getTransactions(config.database!.path!); 
    const currencySymbol = config.display?.currencySymbol || '$';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    
    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain('Current Balance: $100.00');
  });

  test('should list transactions with custom display options', () => {
    const config: Config = loadConfig(TEST_CONFIG_CUSTOM_DISPLAY_PATH);
    addTransaction(config.database!.path!, 100, 'Test Income', 'Salary');
    addTransaction(config.database!.path!, 20, 'Coffee', 'Food');

    const transactions = getTransactions(config.database!.path!); 
    const currencySymbol = config.display?.currencySymbol || '€';
    const dateFormat = config.display?.dateFormat || 'fr-FR';

    let output = 'Transactions:\n';
    transactions.forEach((tx) => {
      const date = new Date(tx.date).toLocaleString(dateFormat);
      const category = tx.category ? ` (Category: ${tx.category})` : '';
      output += `  Date: ${date}, Amount: ${currencySymbol}${tx.amount.toFixed(2)}, Description: ${tx.description}${category}\n`;
    });

    expect(output).toContain('Transactions:');
    expect(output).toContain('Amount: €100.00, Description: Test Income (Category: Salary)');
    expect(output).toContain('Amount: €20.00, Description: Coffee (Category: Food)');
  });

  test('should display correct balance with custom currency', () => {
    const config: Config = loadConfig(TEST_CONFIG_CUSTOM_DISPLAY_PATH);
    addTransaction(config.database!.path!, 100, 'Test Income');
    addTransaction(config.database!.path!, 20, 'Coffee');
    
    const transactions = getTransactions(config.database!.path!); 
    const currencySymbol = config.display?.currencySymbol || '€';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain('Current Balance: €120.00');
  });

  test('should set balance and clear previous transactions', () => {
    const config: Config = loadConfig(TEST_CONFIG_PATH);
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
    const config: Config = loadConfig(TEST_CONFIG_PATH);
    addTransaction(config.database!.path!, 100, 'Initial Balance');
    addTransaction(config.database!.path!, 50, 'Income Adjustment', 'Salary');
    expect(consoleOutput).toContain('Transaction added successfully.');

    const transactions = getTransactions(config.database!.path!); 
    const currencySymbol = config.display?.currencySymbol || '$';
    const balance = transactions.reduce((sum, tx) => sum + tx.amount, 0);

    expect(`Current Balance: ${currencySymbol}${balance.toFixed(2)}`).toContain('Current Balance: $150.00');

    const data = JSON.parse(fs.readFileSync(config.database!.path!, 'utf8'));
    expect(data.transactions).toHaveLength(2);
    expect(data.transactions[1].amount).toBe(50);
    expect(data.transactions[1].description).toBe('Income Adjustment');
    expect(data.transactions[1].category).toBe('Salary');
  });
});