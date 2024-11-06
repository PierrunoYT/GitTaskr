const { db } = require('../db/init');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const validateGitUrl = (url) => {
    if (!url) return true; // Optional field
    const gitUrlPattern = /^(https:\/\/github\.com\/|git@github\.com:).+\/.+\.git$/;
    return gitUrlPattern.test(url) || 'Please enter a valid GitHub repository URL';
};

const addRepository = async () => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter repository name:',
            validate: input => input.length > 0 || 'Repository name cannot be empty'
        },
        {
            type: 'input',
            name: 'path',
            message: 'Enter local repository path:',
            validate: input => {
                try {
                    const fullPath = path.resolve(input);
                    return fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory() || 
                           'Path must be a valid directory';
                } catch (err) {
                    return 'Invalid path';
                }
            },
            filter: input => path.resolve(input)
        },
        {
            type: 'input',
            name: 'remote_url',
            message: 'Enter GitHub repository URL (optional):',
            validate: validateGitUrl
        }
    ]);

    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO repositories (name, path, remote_url) VALUES (?, ?, ?)`;
        db.run(sql, [answers.name, answers.path, answers.remote_url], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    console.log(chalk.red('Repository path already exists in database'));
                }
                reject(err);
                return;
            }
            console.log(chalk.green('✔ Repository added successfully'));
            resolve(this.lastID);
        });
    });
};

const listRepositories = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT r.*, COUNT(t.id) as task_count 
                    FROM repositories r 
                    LEFT JOIN tasks t ON r.id = t.repository_id 
                    GROUP BY r.id 
                    ORDER BY r.created_at DESC`;
        
        db.all(sql, [], (err, rows) => {
            if (err) {
                console.error(chalk.red('Error listing repositories:', err.message));
                reject(err);
                return;
            }

            if (rows.length === 0) {
                console.log(chalk.yellow('No repositories found'));
            } else {
                rows.forEach(repo => {
                    console.log(
                        `${chalk.blue('#' + repo.id)} ${chalk.bold(repo.name)}\n` +
                        `${chalk.gray('Path:')} ${repo.path}\n` +
                        `${repo.remote_url ? chalk.gray('Remote URL: ') + repo.remote_url + '\n' : ''}` +
                        `${chalk.gray('Tasks:')} ${repo.task_count}\n` +
                        `${chalk.gray('Added:')} ${new Date(repo.created_at).toLocaleString()}\n`
                    );
                });
            }
            resolve(rows);
        });
    });
};

const getRepository = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM repositories WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error(chalk.red('Error fetching repository:', err.message));
                reject(err);
                return;
            }
            resolve(row);
        });
    });
};

const deleteRepository = async (id) => {
    const repo = await getRepository(id);
    if (!repo) {
        console.log(chalk.red('Repository not found'));
        return false;
    }

    const confirm = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'proceed',
            message: `Are you sure you want to delete repository "${repo.name}" and all its tasks?`,
            default: false
        }
    ]);

    if (!confirm.proceed) {
        console.log(chalk.yellow('Operation cancelled'));
        return false;
    }

    return new Promise((resolve, reject) => {
        db.run('BEGIN TRANSACTION');
        
        db.run(`DELETE FROM tasks WHERE repository_id = ?`, [id], (err) => {
            if (err) {
                db.run('ROLLBACK');
                console.error(chalk.red('Error deleting repository tasks:', err.message));
                reject(err);
                return;
            }

            db.run(`DELETE FROM repositories WHERE id = ?`, [id], function(err) {
                if (err) {
                    db.run('ROLLBACK');
                    console.error(chalk.red('Error deleting repository:', err.message));
                    reject(err);
                    return;
                }

                db.run('COMMIT');
                console.log(chalk.green('✔ Repository and associated tasks deleted successfully'));
                resolve(true);
            });
        });
    });
};

const updateRepository = async (id) => {
    const repo = await getRepository(id);
    if (!repo) {
        console.log(chalk.red('Repository not found'));
        return false;
    }

    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter new repository name (leave empty to keep current):',
            default: repo.name
        },
        {
            type: 'input',
            name: 'path',
            message: 'Enter new local repository path (leave empty to keep current):',
            default: repo.path,
            validate: input => {
                if (input === repo.path) return true;
                try {
                    const fullPath = path.resolve(input);
                    return fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory() || 
                           'Path must be a valid directory';
                } catch (err) {
                    return 'Invalid path';
                }
            },
            filter: input => path.resolve(input)
        },
        {
            type: 'input',
            name: 'remote_url',
            message: 'Enter new GitHub repository URL (leave empty to keep current):',
            default: repo.remote_url,
            validate: validateGitUrl
        }
    ]);

    return new Promise((resolve, reject) => {
        const sql = `UPDATE repositories 
                    SET name = ?, path = ?, remote_url = ? 
                    WHERE id = ?`;
        
        db.run(sql, [answers.name, answers.path, answers.remote_url, id], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    console.log(chalk.red('Repository path already exists in database'));
                }
                reject(err);
                return;
            }
            console.log(chalk.green('✔ Repository updated successfully'));
            resolve(true);
        });
    });
};

module.exports = {
    addRepository,
    listRepositories,
    getRepository,
    deleteRepository,
    updateRepository
};
