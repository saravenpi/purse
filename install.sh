#!/bin/bash

set -e

# Clone the repository
git clone https://github.com/saravenpi/purse.git
cd purse

# Install bun
curl -fsSL https://bun.sh/install | bash

# Install dependencies and create the executable
~/.bun/bin/bun install
~/.bun/bin/bun build index.ts --compile --outfile purse

# Move the executable to a bin directory
mv purse /usr/local/bin/purse
