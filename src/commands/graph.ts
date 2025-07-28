import { Command } from 'commander';
import { createGraphBalanceCommand } from './graph/balance';
import { createGraphCategoriesCommand } from './graph/categories';

/**
 * Creates the 'graph' command with subcommands for visualizing data.
 * @returns {Command} The Commander command object.
 */
export function createGraphCommand(): Command {
  const graphCommand = new Command();

  graphCommand.name('graph').description('Generate graphs and visualizations');

  graphCommand.addCommand(createGraphBalanceCommand());
  graphCommand.addCommand(createGraphCategoriesCommand());

  return graphCommand;
}
