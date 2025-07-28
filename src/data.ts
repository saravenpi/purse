import * as fs from 'fs';
import * as path from 'path';

export interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
  isSavings?: boolean;
}

interface PurseData {
  transactions: Transaction[];
}

/**
 * Reads data from the specified JSON file.
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
 */
export function addTransaction(
  filePath: string,
  amount: number,
  description: string,
  category?: string,
  isSavings?: boolean
): void {
  const data = readData(filePath);
  const newTransaction: Transaction = {
    id: Date.now().toString(),
    amount: amount,
    description: description,
    date: new Date().toISOString(),
  };
  if (category) {
    newTransaction.category = category;
  }
  if (isSavings) {
    newTransaction.isSavings = isSavings;
  }
  data.transactions.push(newTransaction);
  writeData(filePath, data);
  console.log('Transaction added successfully.');
}

/**
 * Retrieves all transactions from the data file.
 */
export function getTransactions(filePath: string): Transaction[] {
  const data = readData(filePath);
  return data.transactions;
}

/**
 * Clears all transactions from the data file.
 */
export function clearTransactions(filePath: string): void {
  writeData(filePath, { transactions: [] });
  console.log('All transactions cleared.');
}

/**
 * Deletes a transaction by its ID.
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
    return txDate >= cycleStart && txDate <= cycleEnd && tx.amount < 0 && !tx.isSavings;
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

export interface SavingsStats {
  totalSavings: number;
  savingsTransactionCount: number;
  averageSavingsTransaction: number;
  thisMonthSavings: number;
  lastMonthSavings: number;
  savingsGrowthRate: number;
}

/**
 * Gets comprehensive savings statistics.
 */
export function getSavingsStats(filePath: string): SavingsStats {
  const transactions = getTransactions(filePath);
  const savingsTransactions = transactions.filter(tx => tx.isSavings && tx.amount > 0);
  
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  
  const thisMonthSavings = savingsTransactions
    .filter(tx => new Date(tx.date) >= thisMonthStart)
    .reduce((sum, tx) => sum + tx.amount, 0);
    
  const lastMonthSavings = savingsTransactions
    .filter(tx => {
      const txDate = new Date(tx.date);
      return txDate >= lastMonthStart && txDate <= lastMonthEnd;
    })
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalSavings = savingsTransactions.reduce((sum, tx) => sum + tx.amount, 0);
  const savingsTransactionCount = savingsTransactions.length;
  const averageSavingsTransaction = savingsTransactionCount > 0 ? totalSavings / savingsTransactionCount : 0;
  const savingsGrowthRate = lastMonthSavings > 0 ? ((thisMonthSavings - lastMonthSavings) / lastMonthSavings) * 100 : 0;
  
  return {
    totalSavings,
    savingsTransactionCount,
    averageSavingsTransaction,
    thisMonthSavings,
    lastMonthSavings,
    savingsGrowthRate,
  };
}

/**
 * Gets savings transactions within a date range.
 */
export function getSavingsTransactions(filePath: string, startDate?: Date, endDate?: Date): Transaction[] {
  const transactions = getTransactions(filePath);
  let savingsTransactions = transactions.filter(tx => tx.isSavings);
  
  if (startDate || endDate) {
    savingsTransactions = savingsTransactions.filter(tx => {
      const txDate = new Date(tx.date);
      if (startDate && txDate < startDate) return false;
      if (endDate && txDate > endDate) return false;
      return true;
    });
  }
  
  return savingsTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
