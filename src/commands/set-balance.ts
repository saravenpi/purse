import { Command } from 'commander';
import { addTransaction, clearTransactions } from '../data';
import { Config } from '../config';

/**
 * Creates the 'set-balance' command to set the initial balance.
 * @param {Config} config - The configuration object.
 * @returns {Command} The Commander command object.
 */
export function createSetBalanceCommand(config: Config): Command {
  const setBalanceCommand = new Command();

  setBalanceCommand
    .name('set-balance')
    .description('Set the initial balance, clearing all existing transactions')
    .argument('<amount>', 'The amount to set as the new balance')
    .action((amount) => {
      const dbPath = config.database?.path || '~/.purse_data.json';

      clearTransactions(dbPath);
      addTransaction(dbPath, parseFloat(amount), 'Initial Balance', 'System');
      console.log(`Balance set to ${parseFloat(amount).toFixed(2)}.`);
    });

  return setBalanceCommand;
}