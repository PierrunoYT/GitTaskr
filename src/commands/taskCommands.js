const { db } = require('../db/init');
const inquirer = require('inquirer');
const chalk = require('chalk');

const VALID_STATUSES = ['pending', 'in-progress', 'completed'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

const addTask = async (repository_id) => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: 'Enter task title:',
            validate: input => input.length > 0 || 'Task title cannot be empty'
        },
        {
            type: 'input',
            name: 'description',
            message: 'Enter task description (optional):'
        },
        {
            type: 'list',
            name: 'priority',
            message: 'Select task priority:',
            choices: VALID_PRIORITIES,
            default: 'medium'
        },
        {
            type: 'list',
            name: 'status',
            message: 'Select initial status:',
            choices: VALID_STATUSES,
            default: 'pending'
        }
    ]);

    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO tasks (title, description, priority, status, repository_id) 
                    VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [
            answers.title,
            answers.description,
            answers.priority,
            answers.status,
            repository_id
        ], function(err) {
            if (err) {
                console.error(chalk.red('Error adding task:', err.message));
                reject(err);
                return;
            }
            console.log(chalk.green('✔ Task added successfully'));
            resolve(this.lastID);
        });
    });
};

const listTasks = (repository_id, status = null) => {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT t.*, r.name as repo_name 
            FROM tasks t
            JOIN repositories r ON t.repository_id = r.id 
            WHERE t.repository_id = ?
        `;
        const params = [repository_id];

        if (status) {
            if (!VALID_STATUSES.includes(status)) {
                reject(new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`));
                return;
            }
            sql += ` AND t.status = ?`;
            params.push(status);
        }

        sql += ` ORDER BY t.created_at DESC`;

        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error(chalk.red('Error listing tasks:', err.message));
                reject(err);
                return;
            }

            if (rows.length === 0) {
                console.log(chalk.yellow('No tasks found'));
            } else {
                console.log(chalk.blue(`\nTasks for repository: ${rows[0].repo_name}\n`));
                rows.forEach(task => {
                    const priorityColor = {
                        high: chalk.red,
                        medium: chalk.yellow,
                        low: chalk.green
                    };

                    const statusColor = {
                        'pending': chalk.yellow,
                        'in-progress': chalk.blue,
                        'completed': chalk.green
                    };

                    console.log(
                        `${chalk.blue('#' + task.id)} ${chalk.bold(task.title)}\n` +
                        `${chalk.gray('Priority:')} ${priorityColor[task.priority](task.priority)}\n` +
                        `${chalk.gray('Status:')} ${statusColor[task.status](task.status)}\n` +
                        `${task.description ? chalk.gray('Description: ') + task.description + '\n' : ''}` +
                        `${chalk.gray('Created:')} ${new Date(task.created_at).toLocaleString()}\n`
                    );
                });
            }
            resolve(rows);
        });
    });
};

const getTask = (taskId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT t.*, r.name as repo_name 
            FROM tasks t
            JOIN repositories r ON t.repository_id = r.id 
            WHERE t.id = ?
        `;
        
        db.get(sql, [taskId], (err, task) => {
            if (err) {
                console.error(chalk.red('Error fetching task:', err.message));
                reject(err);
                return;
            }
            resolve(task);
        });
    });
};

const updateTaskStatus = async (taskId, newStatus) => {
    if (!VALID_STATUSES.includes(newStatus)) {
        console.error(chalk.red(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`));
        return false;
    }

    const task = await getTask(taskId);
    if (!task) {
        console.log(chalk.red('Task not found'));
        return false;
    }

    return new Promise((resolve, reject) => {
        const sql = `UPDATE tasks SET status = ? WHERE id = ?`;
        db.run(sql, [newStatus, taskId], function(err) {
            if (err) {
                console.error(chalk.red('Error updating task status:', err.message));
                reject(err);
                return;
            }
            console.log(chalk.green(`✔ Task status updated to ${newStatus}`));
            resolve(true);
        });
    });
};

const updateTask = async (taskId) => {
    const task = await getTask(taskId);
    if (!task) {
        console.log(chalk.red('Task not found'));
        return false;
    }

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: 'Enter new task title (leave empty to keep current):',
            default: task.title,
            validate: input => input.length > 0 || 'Task title cannot be empty'
        },
        {
            type: 'input',
            name: 'description',
            message: 'Enter new description (leave empty to keep current):',
            default: task.description
        },
        {
            type: 'list',
            name: 'priority',
            message: 'Select new priority:',
            choices: VALID_PRIORITIES,
            default: task.priority
        },
        {
            type: 'list',
            name: 'status',
            message: 'Select new status:',
            choices: VALID_STATUSES,
            default: task.status
        }
    ]);

    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE tasks 
            SET title = ?, description = ?, priority = ?, status = ? 
            WHERE id = ?
        `;
        
        db.run(sql, [
            answers.title,
            answers.description,
            answers.priority,
            answers.status,
            taskId
        ], function(err) {
            if (err) {
                console.error(chalk.red('Error updating task:', err.message));
                reject(err);
                return;
            }
            console.log(chalk.green('✔ Task updated successfully'));
            resolve(true);
        });
    });
};

const deleteTask = async (taskId) => {
    const task = await getTask(taskId);
    if (!task) {
        console.log(chalk.red('Task not found'));
        return false;
    }

    const confirm = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: `Are you sure you want to delete task "${task.title}"?`,
            default: false
        }
    ]);

    if (!confirm.proceed) {
        console.log(chalk.yellow('Operation cancelled'));
        return false;
    }

    return new Promise((resolve, reject) => {
        const sql = `DELETE FROM tasks WHERE id = ?`;
        db.run(sql, [taskId], function(err) {
            if (err) {
                console.error(chalk.red('Error deleting task:', err.message));
                reject(err);
                return;
            }
            console.log(chalk.green('✔ Task deleted successfully'));
            resolve(true);
        });
    });
};

module.exports = {
    addTask,
    listTasks,
    getTask,
    updateTaskStatus,
    updateTask,
    deleteTask
};
