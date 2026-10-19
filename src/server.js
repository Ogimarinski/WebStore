require('dotenv').config();
const app = require('./app');
const pool = require('./db/pool');

const PORT = process.env.PORT;

async function start() {
    try {
        await pool.query("SELECT 1");
    } catch (err) {
        console.error("Cannot connect to database:", err.message || err.code);
        process.exit(1);
    }

    const server = app.listen(PORT, (err) => {
        if (err) {
            console.error(`Server failed to start on port ${PORT}:`, err.message);
            process.exit(1);
        }

        console.log(`Server: http://localhost:${PORT}`);
    });


    process.once('SIGINT', () => {
        server.close(async () => {
            await pool.end();
            process.exit(0);
        });
    });
}

start();