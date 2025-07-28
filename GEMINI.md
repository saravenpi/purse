# Purse - Personal Finance CLI Tool

## Overview

Purse is a comprehensive command-line interface (CLI) tool designed for personal finance management. Built with TypeScript and powered by Bun, it provides an intuitive way to track transactions, manage budgets, categorize expenses, and generate financial reports.

## Key Features

### 📝 Transaction Management
- Add, edit, and delete financial transactions
- Support for both income and expenses
- Detailed transaction history with timestamps
- Category-based organization
- Interactive transaction management interface

### 💰 Balance Tracking
- Real-time balance calculation
- Set initial balance or update existing balance
- Visual balance indicators with color coding
- Balance evolution tracking over time

### 📂 Category Management
- Create, edit, and delete transaction categories
- Dynamic category assignment during transaction entry
- Category-based spending analysis
- Flexible category system that grows with your needs

### 💸 Budget Management
- Monthly budget allocation per category
- Customizable budget cycle start dates
- Real-time budget tracking with visual indicators
- Over-budget alerts and warnings
- Budget usage percentage calculations
- Comprehensive budget status reporting

### 💰 Savings Tracking
- Mark transactions as savings contributions
- Dedicated savings management interface
- Savings goal tracking and progress visualization
- Integration with budget and reporting systems
- Separate savings analytics and insights

### 📊 Analytics & Reporting
- Interactive ASCII charts for balance evolution
- Category distribution analysis with visual bars
- Comprehensive financial health indicators
- Markdown report generation for external sharing
- Multi-format data visualization

### 🎯 Interactive Mode
- Consolidated interface for all financial operations
- Intuitive navigation with emoji indicators
- Context-aware prompts and validations
- Seamless workflow between different features

## Technical Architecture

### Core Technologies
- **Runtime**: Bun (JavaScript runtime and package manager)
- **Language**: TypeScript for type safety and developer experience
- **CLI Framework**: Commander.js for command parsing and structure
- **Interactive UI**: Inquirer.js for interactive prompts and menus
- **Visualization**: ASCII Chart for terminal-based data visualization
- **Configuration**: YAML-based configuration system
- **Styling**: Chalk for colored terminal output

### Data Management
- **Storage**: JSON-based local file storage
- **Configuration**: YAML configuration files
- **Data Structure**: Transactional data model with categories and metadata
- **Backup**: File-based approach ensures data portability

### Project Structure
```
src/
├── commands/           # CLI command implementations
│   ├── add.ts         # Transaction addition
│   ├── balance.ts     # Balance operations
│   ├── budget.ts      # Budget management
│   ├── category/      # Category operations
│   ├── edit.ts        # Transaction editing
│   ├── graph/         # Visualization commands
│   ├── interactive.ts # Interactive mode
│   └── list.ts        # Transaction listing
├── config.ts          # Configuration management
├── data.ts            # Data operations and storage
└── commands.ts        # Command registry
```

## Design Patterns

### Command Pattern
Each CLI command is implemented as a separate module following the Command pattern, ensuring clean separation of concerns and easy maintainability.

### Interactive UI Pattern
The interactive mode provides a consolidated interface that guides users through complex workflows while maintaining the flexibility of individual commands.

### Configuration-Driven Design
All user preferences, categories, and settings are stored in YAML configuration files, making the tool highly customizable and portable.

### Data Integrity Pattern
All data operations include validation and error handling to ensure data consistency and prevent corruption.

## User Experience Features

### Visual Feedback
- Color-coded balance indicators (green for positive, red for negative)
- Progress bars for budget utilization
- Emoji indicators for different states and actions
- Formatted currency display with locale support

### Intelligent Defaults
- Automatic category suggestions based on existing data
- Default values in prompts to speed up data entry
- Smart date formatting based on user locale

### Error Handling
- Graceful error recovery with helpful error messages
- Input validation with clear feedback
- Operation cancellation support throughout the interface

## Configuration System

### Default Configuration Location
- Primary: `~/.purse.yml`
- Custom path support via `-c, --config` flag

### Configuration Options
```yaml
database:
  path: ~/.purse_data.json

display:
  currencySymbol: '$'
  dateFormat: 'en-US'

categories:
  - Food
  - Transport
  - Entertainment
  - Salary

budget:
  cycleStartDay: 1
  categoryBudgets:
    - category: Food
      monthlyBudget: 500
    - category: Transport
      monthlyBudget: 200

savings:
  goals:
    - name: Emergency Fund
      target: 10000
      priority: high
```

## Development and Testing

### Quality Assurance
- Comprehensive test suite with Bun test framework
- TypeScript compilation checks
- ESLint code quality enforcement
- Prettier code formatting

### Test Coverage
- Unit tests for all core data operations
- Integration tests for CLI commands
- Interactive mode workflow testing
- Configuration management testing
- Budget calculation and cycle testing

### Development Workflow
- Hot reloading during development with `bun run dev`
- Production builds with `bun run build`
- Automated testing with `bun test`
- Code quality checks with `npm run lint`

## Performance Characteristics

### Startup Performance
- Fast startup time thanks to Bun runtime
- Minimal dependencies for quick loading
- Efficient JSON parsing and processing

### Data Operations
- Optimized for local file operations
- Efficient memory usage for transaction processing
- Scalable architecture for growing transaction volumes

### User Interface
- Responsive terminal interface
- Minimal latency for user interactions
- Efficient chart rendering for large datasets

## Security Considerations

### Data Privacy
- All data stored locally on user's machine
- No external data transmission or cloud dependencies
- User-controlled backup and data management

### File System Security
- Proper file permissions and access controls
- Safe configuration file handling
- Protected data directory creation

## Future Extensibility

### Plugin Architecture
The modular command structure allows for easy addition of new features and commands without affecting core functionality.

### Export/Import Capabilities
The JSON-based data storage enables easy data migration and backup strategies.

### API Integration Potential
The clean data model supports future integration with banking APIs or financial services.

## Target Audience

### Primary Users
- Individual users seeking simple personal finance tracking
- Developers who prefer command-line tools
- Users who value data privacy and local storage
- Budget-conscious individuals wanting detailed spending analysis

### Use Cases
- Daily expense tracking and categorization
- Monthly budget planning and monitoring
- Financial goal setting and progress tracking
- Expense report generation for personal or professional use
- Financial habit analysis and improvement

## Competitive Advantages

### Privacy-First Approach
Unlike cloud-based financial tools, Purse keeps all data local, ensuring complete privacy and user control.

### Developer-Friendly
Built with modern development practices and tools, making it easy to extend and customize.

### Comprehensive Feature Set
Combines transaction tracking, budgeting, savings management, and reporting in a single, cohesive tool.

### Terminal Native
Designed specifically for terminal environments, providing a fast and efficient user experience for CLI enthusiasts.

## Success Metrics

### User Engagement
- Daily active usage for transaction entry
- Regular budget monitoring and adjustment
- Consistent savings goal progress
- Report generation frequency

### Data Quality
- Transaction categorization completeness
- Budget adherence rates
- Savings goal achievement rates
- User-defined category utilization

### Technical Performance
- Application startup and response times
- Data processing efficiency
- Test coverage and code quality metrics
- User error rates and recovery success