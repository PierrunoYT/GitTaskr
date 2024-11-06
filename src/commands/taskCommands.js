const { db } = require('../db/init');
const inquirer = require('inquirer');
const chalk = require('chalk');

const addTask = async (repository) => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'title',
            message: 'Enter task title:',
            validate: input => input.length > 0
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
            choices: ['low', 'medium', 'high']
        }
    ]);

    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO tasks (title, description, priority, repository_id) VALUES (?, ?, ?, ?)`;
        db.run(sql, [answers.title, answers.description, answers.priority, repository], function(err) {
            if (err) reject(err);
            else {
                console.log(chalk.green('✔ Task added successfully'));
                resolve(this.lastID);
            }
        });
    });
};

const listTasks = (repository, status) => {
    return new Promise((resolve, reject) => {
        let sql = `SELECT * FROM tasks WHERE repository_id = ?`;
        if (status) {
            sql += ` AND status = ?`;
        }
        sql += ` ORDER BY created_at DESC`;

        const params = status ? [repository, status] : [repository];

        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else {
                if (rows.length === 0) {
                    console.log(chalk.yellow('No tasks found'));
                } else {
                    rows.forEach(task => {
                        const priorityColor = {
                            high: chalk.red,
                            medium: chalk.yellow,
                            low: chalk.green
                        };
                        console.log(
                            `${chalk.blue('#' + task.id)} ${task.title}\n` +
                            `${chalk.gray('Priority:')} ${priorityColor[task.priority](task.priority)}\n` +
                            `${chalk.gray('Status:')} ${task.status}\n` +
                            `${task.description ? chalk.gray(task.description) + '\n' : ''}` +
                            `${chalk.gray('Created:')} ${new Date(task.created_at).toLocaleString()}\n`
                        );
                    });
                }
                resolve(rows);
            }
        });
    });
};

const updateTaskStatus = async (taskId, newStatus) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE tasks SET status = ? WHERE id = ?`;
        db.run(sql, [newStatus, taskId], function(err) {
            if (err) reject(err);
            else {
                if (this.changes > 0) {
                    console.log(chalk.green(`✔ Task status updated to ${newStatus}`));
                } else {
                    console.log(chalk.red('Task not found'));
                }
                resolve(this.changes > 0);
            }
        });
    });
};

module.exports = {
    addTask,
    listTasks,
    updateTaskStatus
};
