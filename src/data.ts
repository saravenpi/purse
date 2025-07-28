import * as fs from 'fs';
import * as path from 'path';

interface Transaction {
  id: string; // Add ID to transaction
  amount: number;
  description: string;
  date: string;
  category?: string;
}

interface PurseData {
  transactions: Transaction[];
}

/**
 * Reads data from the specified JSON file.
 * @param {string} filePath - The path to the JSON data file.
 * @returns {PurseData} The parsed data, or an empty structure if the file doesn't exist or is invalid.
 */
function readData(filePath: string): PurseData {
  if (!fs.existsSync(filePath)) {
    return { transactions: [] };
  }
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents) as PurseData;
  } catch (e) {
    console.error(`Error reading data from ${filePath}:`, e);
    return { transactions: [] };
  }
}

/**
 * Writes data to the specified JSON file.
 * @param {string} filePath - The path to the JSON data file.
 * @param {PurseData} data - The data to write.
 */
function writeData(filePath: string, data: PurseData): void {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error(`Error writing data to ${filePath}:`, e);
  }
}

/**
 * Adds a new transaction to the data file.
 * @param {string} filePath - The path to the JSON data file.
 * @param {number} amount - The amount of the transaction.
 * @param {string} description - The description of the transaction.
 * @param {string} [category] - The category of the transaction.
 */
export function addTransaction(
  filePath: string,
  amount: number,
  description: string,
  category?: string
): void {
  const data = readData(filePath);
  const newTransaction: Transaction = {
    id: Date.now().toString(), // Simple unique ID
    amount: amount,
    description: description,
    date: new Date().toISOString(),
  };
  if (category) {
    newTransaction.category = category;
  }
  data.transactions.push(newTransaction);
  writeData(filePath, data);
  console.log('Transaction added successfully.');
}

/**
 * Retrieves all transactions from the data file.
 * @param {string} filePath - The path to the JSON data file.
 * @returns {Transaction[]} An array of transactions.
 */
export function getTransactions(filePath: string): Transaction[] {
  const data = readData(filePath);
  return data.transactions;
}

/**
 * Clears all transactions from the data file.
 * @param {string} filePath - The path to the JSON data file.
 */
export function clearTransactions(filePath: string): void {
  writeData(filePath, { transactions: [] });
  console.log('All transactions cleared.');
}

/**
 * Deletes a transaction by its ID.
 * @param {string} filePath - The path to the JSON data file.
 * @param {string} id - The ID of the transaction to delete.
 */
export function deleteTransaction(filePath: string, id: string): void {
  const data = readData(filePath);
  const initialLength = data.transactions.length;
  data.transactions = data.transactions.filter((tx) => tx.id !== id);
  if (data.transactions.length < initialLength) {
    writeData(filePath, data);
    console.log(`Transaction with ID ${id} deleted successfully.`);
  } else {
    console.log(`Transaction with ID ${id} not found.`);
  }
}

/**
 * Edits an existing transaction.
 * @param {string} filePath - The path to the JSON data file.
 * @param {string} id - The ID of the transaction to edit.
 * @param {Partial<Transaction>} updates - The updates to apply to the transaction.
 */
export function editTransaction(
  filePath: string,
  id: string,
  updates: Partial<Omit<Transaction, 'id'>>
): void {
  const data = readData(filePath);
  const index = data.transactions.findIndex((tx) => tx.id === id);
  if (index !== -1) {
    const currentTransaction = data.transactions[index]!;
    data.transactions[index] = {
      id: currentTransaction.id,
      amount: updates.amount ?? currentTransaction.amount,
      description: updates.description ?? currentTransaction.description,
      date: updates.date ?? currentTransaction.date,
      category: updates.category ?? currentTransaction.category,
    };
    writeData(filePath, data);
    console.log(`Transaction with ID ${id} updated successfully.`);
  } else {
    console.log(`Transaction with ID ${id} not found.`);
  }
}

export interface BudgetUsage {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
}

/**
 * Gets budget usage for all categories in the current cycle.
 * @param {string} filePath - The path to the JSON data file.
 * @param {Date} cycleStart - The start date of the budget cycle.
 * @param {Date} cycleEnd - The end date of the budget cycle.
 * @param {CategoryBudget[]} categoryBudgets - The category budgets configuration.
 * @returns {BudgetUsage[]} Array of budget usage information.
 */
export function getBudgetUsage(
  filePath: string,
  cycleStart: Date,
  cycleEnd: Date,
  categoryBudgets: { category: string; monthlyBudget: number }[]
): BudgetUsage[] {
  const transactions = getTransactions(filePath);
  const cycleTransactions = transactions.filter((tx) => {
    const txDate = new Date(tx.date);
    return txDate >= cycleStart && txDate <= cycleEnd && tx.amount < 0;
  });

  const categorySpending: { [key: string]: number } = {};

  cycleTransactions.forEach((tx) => {
    const category = tx.category || 'Uncategorized';
    categorySpending[category] = (categorySpending[category] || 0) + Math.abs(tx.amount);
  });

  return categoryBudgets.map((budgetConfig) => {
    const spent = categorySpending[budgetConfig.category] || 0;
    const remaining = Math.max(0, budgetConfig.monthlyBudget - spent);
    const percentage = budgetConfig.monthlyBudget > 0 ? (spent / budgetConfig.monthlyBudget) * 100 : 0;

    return {
      category: budgetConfig.category,
      budget: budgetConfig.monthlyBudget,
      spent,
      remaining,
      percentage,
    };
  });
}
