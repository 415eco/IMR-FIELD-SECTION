// This Node.js server acts as the API layer (the 'plumbing') between your HTML/JS frontend
// and your MS SQL Server database, *filtered for Field Officer endpoints only*.

const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 3000;

// --- CRITICAL CONFIGURATION ---
// The following dbConfig uses the credentials and server name you provided:
const dbConfig = {
    user: 'sa',
    password: 'root',
    server: 'DESKTOP-9T6V3MJ\\SQLEXPRESS', // <-- COMBINE server and instance here
    database: 'UMS_System',
    options: {
        trustedConnection: false,
        enableArithAbort: true,
        trustServerCertificate: true
    }
}

// --- Middleware ---
app.use(cors()); // Allows our HTML page (which runs locally) to talk to this server
app.use(express.json()); // Allows the server to parse JSON data sent from the forms

// --- Database Connection Pool ---
let pool;

async function connectDb() {
    try {
        if (!pool) {
            pool = await sql.connect(dbConfig);
            console.log('Database connection established successfully.');
        }
        return pool;
    } catch (err) {
        console.error('Database Connection Failed! Details:', err.message);
        console.error('Check your dbConfig: user, password, server, and instanceName.');
        throw err;
    }
}

// Immediately attempt connection when the server starts
connectDb();

// ----------------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINT (Common for all roles)
// POST /login
// ----------------------------------------------------------------------

app.post('/login', async (req, res) => {
    const { username, password, role } = req.body;
    
    if (!username || !password || !role) {
        return res.status(400).json({ success: false, message: 'Missing username, password, or role.' });
    }

    try {
        const pool = await connectDb();
        const request = pool.request();
        
        request.input('username', sql.NVarChar, username);
        request.input('password', sql.NVarChar, password); 
        request.input('role', sql.NVarChar, role);

        const result = await request.query(
            `SELECT UserID, FullName, Role 
             FROM [dbo].[User_Staff] 
             WHERE Username = @username 
             AND PasswordHash = @password 
             AND Role = @role`
        );

        if (result.recordset.length > 0) {
            res.json({ success: true, user: result.recordset[0] });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials or incorrect role selected.' });
        }

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).json({ success: false, message: 'Server error during login process.' });
    }
});

// ----------------------------------------------------------------------
// 2. FIELD OFFICER DATA RETRIEVAL (GET) ENDPOINTS
// ----------------------------------------------------------------------

// --- GET /getRoutes (Field Officer: My Assigned Route) ---
app.get('/getRoutes', async (req, res) => {
    try {
        const pool = await connectDb();
        const query = `
            SELECT M.MeterID, C.CustomerName, C.ServiceAddress, U.UtilityName
            FROM [dbo].[Meter] AS M
            JOIN [dbo].[Customer] AS C ON M.CustomerID = C.CustomerID
            JOIN [dbo].[Utility_Type] AS U ON M.UtilityID = U.UtilityID
            WHERE M.Status = 'Active'
            AND M.MeterID NOT IN (
                SELECT R.MeterID
                FROM [dbo].[Meter_Reading] AS R
                WHERE MONTH(R.ReadingDate) = MONTH(GETDATE())
                AND YEAR(R.ReadingDate) = YEAR(GETDATE())
            )
        `;
        const result = await pool.request().query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('Get Routes Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to retrieve routes.' });
    }
});

// --- GET /api/meter-details/:id (Field Officer: Enter Meter Reading) ---
app.get('/api/meter-details/:id', async (req, res) => {
    const meterId = req.params.id; // Get the ID from the URL (e.g., "MTR-E-001")

    try {
        const pool = await connectDb();
        const request = pool.request();

        const query = `
            SELECT 
                m.MeterID, 
                c.CustomerName, 
                c.ServiceAddress
            FROM 
                dbo.Meter AS m
            INNER JOIN 
                dbo.Customer AS c ON m.CustomerID = c.CustomerID
            WHERE 
                m.MeterID = @MeterID
        `;
        
        request.input('MeterID', sql.NVarChar, meterId);
        const result = await request.query(query);

        if (result.recordset.length > 0) {
            res.json({ success: true, data: result.recordset[0] });
        } else {
            res.status(404).json({ success: false, message: 'Meter not found.' });
        }

    } catch (err) {
        console.error('Get Meter Details Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to retrieve meter details.' });
    }
});


// ----------------------------------------------------------------------
// 3. FIELD OFFICER DATA SUBMISSION (POST) ENDPOINT
// ----------------------------------------------------------------------

// --- POST /submitReading (Field Officer) ---
app.post('/submitReading', async (req, res) => {
    const { 
        'meter-id': meterId, 
        'reading-value': readingValue, 
        'reading-date': readingDate,
        'notes': notes 
    } = req.body;

    if (!meterId || !readingValue || !readingDate) {
        return res.status(400).json({ success: false, message: 'Missing Meter ID, Reading Value, or Date.' });
    }

    const fieldOfficerId = 'U-002'; // Placeholder ID for the Field Officer

    try {
        const pool = await connectDb();
        const request = pool.request();

        // Inserts the new reading and notes
        const query = `
            INSERT INTO [dbo].[Meter_Reading] 
                (MeterID, UserID, ReadingValue, ReadingDate, Notes)
            VALUES 
                (@meterId, @userId, @readingValue, @readingDate, @notes)
        `;
        
        request.input('meterId', sql.NVarChar, meterId);
        request.input('userId', sql.NVarChar, fieldOfficerId);
        request.input('readingValue', sql.Decimal(10, 2), readingValue);
        request.input('readingDate', sql.Date, readingDate);
        request.input('notes', sql.NVarChar, notes || null); // Pass notes, or null if it's empty

        await request.query(query);
        res.json({ success: true, message: 'Reading submitted successfully.' });
    } catch (err) {
        console.error('Submit Reading Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to submit reading. Check if Meter ID is correct.' });
    }
});


// ----------------------------------------------------------------------
// 4. SERVER LISTENER
// ----------------------------------------------------------------------
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
