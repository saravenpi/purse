import { Command } from 'commander';
import { createAddCommand } from './commands/add';
import { createListCommand } from './commands/list';
import { createInteractiveCommand } from './commands/interactive';
import { createBalanceCommand } from './commands/balance';
import { createSetBalanceCommand } from './commands/set-balance';
import { createUpdateBalanceCommand } from './commands/update-balance';
import { createDeleteCommand } from './commands/delete';
import { createEditCommand } from './commands/edit';
import { createCategoryCommand } from './commands/category';
import { createGraphCommand } from './commands/graph';
import { createBudgetCommand } from './commands/budget';
import { createSavingsCommand } from './commands/savings';

/**
 * Returns an array of all commands for the purse CLI.
 */
export function getAllCommands(): Command[] {
  return [
    createAddCommand(),
    createListCommand(),
    createInteractiveCommand(),
    createBalanceCommand(),
    createSetBalanceCommand(),
    createUpdateBalanceCommand(),
    createDeleteCommand(),
    createEditCommand(),
    createCategoryCommand(),
    createGraphCommand(),
    createBudgetCommand(),
    createSavingsCommand(),
  ];
}
