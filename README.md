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

### Interactive Mode

To start the interactive mode, run:

```bash
purse interactive
# or
purse -i
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
```