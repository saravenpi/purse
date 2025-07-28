# Purse

A simple CLI tool to track your finances.

## Installation

```bash
curl -fsSL https://raw.githubusercontent.com/your-username/purse/main/install.sh | sh
```

## Usage

```bash
purse --help
```

To add a transaction with a category:

```bash
purse add --amount 25.50 --description "Coffee" --category "Food"
```

To check your current balance:

```bash
purse balance
```

To delete a transaction:

```bash
purse delete <transaction-id>
```

To edit a transaction:

```bash
purse edit <transaction-id> --amount 15.00 --description "New Description" --category "New Category"
```

To set a new balance (clears all existing transactions):

```bash
purse set-balance 1000
```

To update the balance (adds a transaction to adjust the balance):

```bash
purse update-balance 500 --description "Bonus Income" --category "Salary"
```

### Interactive Mode

To start the interactive mode, run:

```bash
purse interactive
# or
purse -i
```

The interactive mode now provides consolidated options for managing your finances:

*   **📝 Manage Transactions**: Add, list, edit, or delete individual transactions.
*   **💰 Manage Balance**: View your current balance, set a new balance, or update it with income/expenses.
*   **📂 Manage Categories**: Add, edit, or delete transaction categories.


### Category Management

To add a new category:

```bash
purse category add <category-name>
```

To edit an existing category:

```bash
purse category edit <old-category-name> <new-category-name>
```

To delete a category:

```bash
purse category delete <category-name>
```

### Development

To run the CLI in development mode with hot reloading:

```bash
bun run dev
```

To run the CLI in production mode:

```bash
bun run start
```

### Building

To build the `purse` binary:

```bash
bun run build
```

### Configuration

The `purse` CLI can load configuration from a YAML file. By default, it looks for a file named `.purse.yml` in your home directory (`~/.purse.yml`).

You can specify a custom configuration file path using the `-c` or `--config` flag:

```bash
purse --config /path/to/your/custom/config.yml <command>
```

Example `~/.purse.yml`:

```yaml
database:
  path: ~/.purse_data.json

display:
  currencySymbol: '€'
  dateFormat: 'fr-FR' # e.g., 'en-US', 'en-GB', 'fr-FR'

categories:
  - Food
  - Transport
  - Salary
  - Rent
  - Utilities
  - Entertainment
```

An example configuration file `example.yml` is provided in the project root for reference.

### Category Management

Categories can be managed via the CLI or interactive mode. Changes are saved to your configuration file.

To add a new category:

```bash
purse category add <category-name>
```

To edit an existing category:

```bash
purse category edit <old-category-name> <new-category-name>
```

To delete a category:

```bash
purse category delete <category-name>
```

### Testing

To run the test suite:

```bash
bun test
```