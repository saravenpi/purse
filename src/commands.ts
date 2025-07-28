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
import { Config } from '../config';

/**
 * Returns an array of all commands for the purse CLI.
 * @param {Config} config - The loaded configuration object.
 * @param {string} configFilePath - The path to the configuration file.
 * @returns {Command[]} An array of Commander command objects.
 */
export function getAllCommands(config: Config, configFilePath: string): Command[] {
  return [
    createAddCommand(config),
    createListCommand(config),
    createInteractiveCommand(config, configFilePath),
    createBalanceCommand(config),
    createSetBalanceCommand(config),
    createUpdateBalanceCommand(config),
    createDeleteCommand(config),
    createEditCommand(),
    createCategoryCommand()
  ];
}
