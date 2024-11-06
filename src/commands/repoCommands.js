const { db } = require('../db/init');
const inquirer = require('inquirer');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

const addRepository = async () => {
    const answers = await inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: 'Enter repository name:',
            validate: input => input.length > 0
        },
        {
            type: 'input',
            name: 'path',
            message: 'Enter local repository path:',
            validate: input => {
                const fullPath = path.resolve(input);
                return fs.existsSync(fullPath) && fs.lstatSync(fullPath).isDirectory();
            },
            filter: input => path.resolve(input)
        },
        {
            type: 'input',
            name: 'remote_url',
            message: 'Enter remote repository URL (optional):'
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
            } else {
                console.log(chalk.green('✔ Repository added successfully'));
                resolve(this.lastID);
            }
        });
    });
};

const listRepositories = () => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM repositories ORDER BY created_at DESC`;
        db.all(sql, [], (err, rows) => {
            if (err) reject(err);
            else {
                if (rows.length === 0) {
                    console.log(chalk.yellow('No repositories found'));
                } else {
                    rows.forEach(repo => {
                        console.log(
                            `${chalk.blue('#' + repo.id)} ${chalk.bold(repo.name)}\n` +
                            `${chalk.gray('Path:')} ${repo.path}\n` +
                            `${repo.remote_url ? chalk.gray('Remote URL: ') + repo.remote_url + '\n' : ''}` +
                            `${chalk.gray('Added:')} ${new Date(repo.created_at).toLocaleString()}\n`
                        );
                    });
                }
                resolve(rows);
            }
        });
    });
};

const getRepository = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM repositories WHERE id = ?`;
        db.get(sql, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

module.exports = {
    addRepository,
    listRepositories,
    getRepository
};
