const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const chalk = require('chalk');

const dbPath = path.join(__dirname, 'github_projects.db');

// Improved database connection with error handling
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(chalk.red('Database connection failed:', err.message));
        process.exit(1);
    }
    console.log(chalk.green('Connected to database successfully'));
});

// Add cleanup handler
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error(chalk.red('Error closing database:', err.message));
            process.exit(1);
        }
        console.log(chalk.yellow('\nDatabase connection closed'));
        process.exit(0);
    });
});

function initializeDatabase() {
    db.serialize(() => {
        // Create repositories table first
        db.run(`CREATE TABLE IF NOT EXISTS repositories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE,
            remote_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
            if (err) {
                console.error(chalk.red('Error creating repositories table:', err.message));
                process.exit(1);
            }
        });

        // Then create tasks table with proper constraints
        db.run(`CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT CHECK(status IN ('pending', 'in-progress', 'completed')) DEFAULT 'pending',
            priority TEXT CHECK(priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            repository_id INTEGER,
            FOREIGN KEY (repository_id) REFERENCES repositories (id) ON DELETE CASCADE,
            CHECK(length(title) > 0)
        )`, (err) => {
            if (err) {
                console.error(chalk.red('Error creating tasks table:', err.message));
                process.exit(1);
            }
        });
    });
}

module.exports = {
    db,
    initializeDatabase
};
