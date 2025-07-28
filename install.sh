#!/bin/bash

set -e

# Check if purse is already installed
PURSE_PATH="$HOME/.local/bin/purse"
IS_UPDATE=false

if [ -f "$PURSE_PATH" ]; then
    IS_UPDATE=true
    echo "🔄 Updating purse to the latest version..."
    
    # Get current version if possible
    CURRENT_VERSION=$("$PURSE_PATH" --version 2>/dev/null || echo "unknown")
    echo "📦 Current version: $CURRENT_VERSION"
else
    echo "📥 Installing purse for the first time..."
fi

# Create temporary directory for installation
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Clone the repository to temp directory
git clone https://github.com/saravenpi/purse.git "$TEMP_DIR/purse"
cd "$TEMP_DIR/purse"

# Install bun if not already installed
if ! command -v bun &> /dev/null; then
    echo "Installing bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

# Install dependencies and create the executable
bun install
bun build index.ts --compile --outfile purse

# Create user bin directory if it doesn't exist
mkdir -p "$HOME/.local/bin"

# Move the executable to user bin directory
mv purse "$HOME/.local/bin/purse"
chmod +x "$HOME/.local/bin/purse"

# Add to PATH if not already there
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo "Adding $HOME/.local/bin to PATH in your shell profile..."
    
    # Detect shell and add to appropriate profile
    if [[ -n "$ZSH_VERSION" ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
        echo "Added to ~/.zshrc"
    elif [[ -n "$BASH_VERSION" ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
        echo "Added to ~/.bashrc"
    else
        echo "Please manually add $HOME/.local/bin to your PATH"
    fi
fi

# Clean up temporary directory
cd "$HOME"
rm -rf "$TEMP_DIR"

if [ "$IS_UPDATE" = true ]; then
    # Get new version
    NEW_VERSION=$("$PURSE_PATH" --version 2>/dev/null || echo "unknown")
    echo "✅ purse updated successfully!"
    echo "📦 Updated from version $CURRENT_VERSION to $NEW_VERSION"
else
    echo "✅ purse installed successfully to $HOME/.local/bin/purse"
    echo "🎉 Welcome to purse! Your personal finance CLI tool"
    echo "💡 You may need to restart your terminal or run 'source ~/.bashrc' (or ~/.zshrc) to use the 'purse' command"
    echo "🚀 Get started with 'purse interactive' or 'purse --help'"
fi
