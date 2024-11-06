# Personal GitHub Project Management CLI

A command-line interface tool for managing GitHub projects locally. Track tasks and organize repositories offline with a simple CLI interface.

## Features

- Local repository management
- Task tracking per repository
- Offline-first approach
- SQLite database for data persistence

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Link the CLI globally:
```bash
npm run link
```

## Usage

The CLI tool can be accessed using the `ghpm` command.

### Repository Management

Add a new repository:
```bash
ghpm repo-add
```

List all repositories:
```bash
ghpm repo-list
```

### Task Management

Add a new task to a repository:
```bash
ghpm task-add <repo-id>
```

List tasks for a repository:
```bash
ghpm task-list <repo-id>
```

List tasks with status filter:
```bash
ghpm task-list <repo-id> --status pending
ghpm task-list <repo-id> --status in-progress
ghpm task-list <repo-id> --status completed
```

Update task status:
```bash
ghpm task-update <task-id> <status>
```
Valid status values: `pending`, `in-progress`, `completed`

## Database

The application uses SQLite for data storage. The database file is created automatically in the `src/db` directory when you first run the application.

## Technologies Used

- Node.js
- SQLite (sqlite3)
- Commander.js (CLI framework)
- Inquirer.js (Interactive prompts)
- Chalk (Terminal styling)
