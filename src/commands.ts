import { Command } from 'commander';
import { createAddCommand } from './commands/add';
import { createListCommand } from './commands/list';
import { createInteractiveCommand } from './commands/interactive';
import { createBalanceCommand } from './commands/balance';

/**
 * Returns an array of all commands for the purse CLI.
 * @returns {Command[]} An array of Commander command objects.
 */
export function getAllCommands(config: object): Command {
  return [
    createAddCommand(config),
    createListCommand(config),
    createInteractiveCommand(config),
    createBalanceCommand(config)
  ];
}