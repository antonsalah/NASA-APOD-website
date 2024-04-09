const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const streamPipeline = require('util').promisify(require('stream').pipeline);
const dbPath = path.join(__dirname, 'apod.db');
const app = express();
const PORT = process.env.PORT || 3000;
const { apiKey } = require('../config');
const imagesDirectory = path.join(__dirname, 'public', 'images');


// Initialize the SQLite database
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) console.error('Error opening database', err.message);
    else console.log('Connected to the SQLite database.');
});


if (!fs.existsSync(imagesDirectory)){
    fs.mkdirSync(imagesDirectory, { recursive: true });
}

app.use(express.static('public'));

app.get('/apod/:date', (req, res) => {
    const date = req.params.date;

    db.get(`SELECT * FROM apod WHERE date = ?`, [date], async (err, row) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: "Database query error." });
        }
        if (row) {
            console.log("Serving from database");
            res.json({ imageUrl: row.imagePath, explanation: row.explanation, title: row.title });
        } else {
            console.log("Fetching from API");
            const response = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}`);
            const data = await response.json();
            if (!response.ok) return res.status(500).json({ error: "Failed to fetch APOD" });

            const imageUrl = data.url;
            const imageName = imageUrl.split('/').pop();
            const imagePath = path.join(imagesDirectory, imageName);

            try {
                const imageResponse = await fetch(imageUrl);
                if (!imageResponse.ok) throw new Error('Failed to download image');
                await streamPipeline(imageResponse.body, fs.createWriteStream(imagePath));

                const insertSql = `INSERT INTO apod (date, imagePath, explanation, title) VALUES (?, ?, ?, ?)`;
                db.run(insertSql, [date, `/images/${imageName}`, data.explanation, data.title], function(err) {
                    if (err) console.error(err.message);
                    else console.log(`A record has been inserted with row id ${this.lastID}`);
                });

                res.json({ imageUrl: `/images/${imageName}`, explanation: data.explanation, title: data.title });
            } catch (error) {
                console.error('Failed to process image', error);
                res.status(500).json({ error: "Failed to process image" });
            }
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
