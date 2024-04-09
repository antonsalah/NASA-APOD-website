const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, 'apod.db');

let db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
        throw err;
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE apod (
            date TEXT PRIMARY KEY,
            imagePath TEXT,
            explanation TEXT,
            title TEXT
        )`, (err) => {
            if (err) {
                // Table already created
                console.log("Table already exists.");
            } else {
                console.log("Table just created.");
            }
        });
    }
});
