#!/usr/bin/env node

const { program } = require('commander');
const { initializeDatabase } = require('./db/init');
const { addRepository, listRepositories, getRepository } = require('./commands/repoCommands');
const { addTask, listTasks, updateTaskStatus } = require('./commands/taskCommands');
const chalk = require('chalk');

// Initialize database
initializeDatabase();

program
    .name('gittaskr')
    .description('GitHub Project Management CLI')
    .version('1.0.0');

// Repository commands
program
    .command('repo-add')
    .description('Add a new repository')
    .action(async () => {
        try {
            await addRepository();
        } catch (err) {
            if (err.code !== 'SQLITE_CONSTRAINT') {
                console.error(chalk.red('Error adding repository:', err.message));
            }
        }
    });

program
    .command('repo-list')
    .description('List all repositories')
    .action(async () => {
        try {
            await listRepositories();
        } catch (err) {
            console.error(chalk.red('Error listing repositories:', err.message));
        }
    });

// Task commands
program
    .command('task-add')
    .description('Add a new task')
    .argument('<repo-id>', 'Repository ID')
    .action(async (repoId) => {
        try {
            const repo = await getRepository(repoId);
            if (!repo) {
                console.error(chalk.red('Repository not found'));
                return;
            }
            await addTask(repoId);
        } catch (err) {
            console.error(chalk.red('Error adding task:', err.message));
        }
    });

program
    .command('task-list')
    .description('List tasks for a repository')
    .argument('<repo-id>', 'Repository ID')
    .option('-s, --status <status>', 'Filter by status (pending/in-progress/completed)')
    .action(async (repoId, options) => {
        try {
            const repo = await getRepository(repoId);
            if (!repo) {
                console.error(chalk.red('Repository not found'));
                return;
            }
            await listTasks(repoId, options.status);
        } catch (err) {
            console.error(chalk.red('Error listing tasks:', err.message));
        }
    });

program
    .command('task-update')
    .description('Update task status')
    .argument('<task-id>', 'Task ID')
    .argument('<status>', 'New status (pending/in-progress/completed)')
    .action(async (taskId, status) => {
        try {
            const validStatuses = ['pending', 'in-progress', 'completed'];
            if (!validStatuses.includes(status)) {
                console.error(chalk.red('Invalid status. Use: pending, in-progress, or completed'));
                return;
            }
            await updateTaskStatus(taskId, status);
        } catch (err) {
            console.error(chalk.red('Error updating task:', err.message));
        }
    });

program.parse();
