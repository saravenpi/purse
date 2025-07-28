import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '../index.ts');
const TEST_DB_PATH = path.resolve(__dirname, './test_data.json');
const TEST_CONFIG_PATH = path.resolve(__dirname, './test_config.yml');
const TEST_CONFIG_CUSTOM_DISPLAY_PATH = path.resolve(__dirname, './test_config_custom_display.yml');

describe('Purse CLI', () => {
  beforeAll(() => {
    // Ensure the test data directory exists
    const testDir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    // Clean up any existing test data before running tests
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Create a test config file
    fs.writeFileSync(TEST_CONFIG_PATH, `database:\n  path: ${TEST_DB_PATH}\n`);
    fs.writeFileSync(TEST_CONFIG_CUSTOM_DISPLAY_PATH, `database:\n  path: ${TEST_DB_PATH}\ndisplay:\n  currencySymbol: '€'\n  dateFormat: 'fr-FR'\n`);
  });

  afterAll(() => {
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
  });

  test('should display help message', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('Usage: purse [command] [options]');
    expect(stdout).toContain('A simple CLI tool to track your finances.');
  });

  test('should add a transaction with category', async () => {
    const { stdout } = await runCli(['add', '--amount', '100', '--description', 'Test Income', '--category', 'Salary', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Transaction added successfully.');

    const data = JSON.parse(fs.readFileSync(TEST_DB_PATH, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(100);
    expect(data.transactions[0].description).toBe('Test Income');
    expect(data.transactions[0].category).toBe('Salary');
  });

  test('should list transactions with category and default display', async () => {
    const { stdout } = await runCli(['list', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Transactions:');
    expect(stdout).toContain('Amount: $100.00, Description: Test Income (Category: Salary)');
  });

  test('should display correct balance with default currency', async () => {
    const { stdout } = await runCli(['balance', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Current Balance: $100.00');
  });

  test('should list transactions with custom display options', async () => {
    // Add another transaction for custom display test
    await runCli(['add', '--amount', '20', '--description', 'Coffee', '--category', 'Food', '-c', TEST_CONFIG_CUSTOM_DISPLAY_PATH]);

    const { stdout } = await runCli(['list', '-c', TEST_CONFIG_CUSTOM_DISPLAY_PATH]);
    expect(stdout).toContain('Transactions:');
    expect(stdout).toContain('Amount: €100.00, Description: Test Income (Category: Salary)');
    expect(stdout).toContain('Amount: €20.00, Description: Coffee (Category: Food)');
  });

  test('should display correct balance with custom currency', async () => {
    const { stdout } = await runCli(['balance', '-c', TEST_CONFIG_CUSTOM_DISPLAY_PATH]);
    expect(stdout).toContain('Current Balance: €120.00');
  });
});

/**
 * Helper function to run the CLI command.
 * @param {string[]} args - Arguments to pass to the CLI.
 * @returns {Promise<{stdout: string, stderr: string}>} - CLI output.
 */
function runCli(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [CLI_PATH, ...args]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code !== 0 && !args.includes('--help')) {
        // Reject only if it's an actual error and not just help output
        reject(new Error(`CLI exited with code ${code}:\n${stderr}`));
      } else {
        resolve({ stdout, stderr });
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}