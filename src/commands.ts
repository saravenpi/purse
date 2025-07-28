import { Command } from 'commander';
import { createAddCommand } from './commands/add';
import { createListCommand } from './commands/list';
import { createInteractiveCommand } from './commands/interactive';

/**
 * Returns an array of all commands for the purse CLI.
 * @returns {Command[]} An array of Commander command objects.
 */
export function getAllCommands(): Command[] {
  return [
    createAddCommand(),
    createListCommand(),
    createInteractiveCommand()
  ];
}