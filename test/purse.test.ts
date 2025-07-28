import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const CLI_PATH = path.resolve(__dirname, '../index.ts');
const TEST_DB_PATH = path.resolve(__dirname, './test_data.json');
const TEST_CONFIG_PATH = path.resolve(__dirname, './test_config.yml');

describe('Purse CLI', () => {
  beforeAll(() => {
    // Clean up any existing test data before running tests
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    // Create a test config file
    fs.writeFileSync(TEST_CONFIG_PATH, `database:\n  path: ${TEST_DB_PATH}\n`);
  });

  afterAll(() => {
    // Clean up test data after all tests are done
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test('should display help message', async () => {
    const { stdout } = await runCli(['--help']);
    expect(stdout).toContain('Usage: purse [command] [options]');
    expect(stdout).toContain('A simple CLI tool to track your finances.');
  });

  test('should add a transaction', async () => {
    const { stdout } = await runCli(['add', '--amount', '100', '--description', 'Test Income', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Transaction added successfully.');

    const data = JSON.parse(fs.readFileSync(TEST_DB_PATH, 'utf8'));
    expect(data.transactions).toHaveLength(1);
    expect(data.transactions[0].amount).toBe(100);
    expect(data.transactions[0].description).toBe('Test Income');
  });

  test('should list transactions', async () => {
    // Add another transaction first
    await runCli(['add', '--amount', '50', '--description', 'Test Expense', '-c', TEST_CONFIG_PATH]);

    const { stdout } = await runCli(['list', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Transactions:');
    expect(stdout).toContain('Amount: 100, Description: Test Income');
    expect(stdout).toContain('Amount: 50, Description: Test Expense');
  });

  test('should display correct balance', async () => {
    const { stdout } = await runCli(['balance', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Current Balance: 150.00'); // 100 + 50
  });

  test('should handle interactive mode (basic check)', async () => {
    const { stdout } = await runCli(['interactive', '-c', TEST_CONFIG_PATH]);
    expect(stdout).toContain('Starting interactive session...');
    expect(stdout).toContain('What do you want to do?');
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
