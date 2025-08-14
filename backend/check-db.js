import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, '../data/astral-draft.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking database tables...');

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Existing tables:');
        rows.forEach(row => console.log('  -', row.name));
        
        // Check if any fantasy football tables exist
        const fantasyTables = rows.filter(r => 
            r.name.includes('league') || 
            r.name.includes('team') || 
            r.name.includes('player') ||
            r.name.includes('nfl')
        );
        
        console.log('\nFantasy football tables found:', fantasyTables.length);
        if (fantasyTables.length > 0) {
            fantasyTables.forEach(table => console.log('  -', table.name));
        }
        
        // Check Oracle tables
        const oracleTables = rows.filter(r => 
            r.name.includes('oracle') || 
            r.name.includes('prediction') ||
            r.name.includes('user')
        );
        
        console.log('\nOracle/User tables found:', oracleTables.length);
        if (oracleTables.length > 0) {
            oracleTables.forEach(table => console.log('  -', table.name));
        }
    }
    
    db.close();
});
