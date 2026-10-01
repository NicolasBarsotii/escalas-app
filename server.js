const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Caminho do banco de dados (compatível com Railway Volume)
const DB_PATH = path.join(__dirname, 'data', 'db.json');
const DB_DIR = path.join(__dirname, 'data');

// Garante que a pasta data existe
if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
}

// Garante que o arquivo db.json existe
if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ columns: [] }, null, 2));
}

app.use(cors());
app.use(express.json());

// CORREÇÃO: caminho absoluto para a pasta public
app.use(express.static(path.join(__dirname, 'public')));

const readDB = () => JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
const writeDB = (data) => fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// ================= ROTAS DE COLUNAS (SEMANAS) =================

app.get('/api/columns', (req, res) => {
    res.json(readDB().columns);
});

app.post('/api/columns', (req, res) => {
    const db = readDB();
    const newColumn = { 
        id: `col-${Date.now()}`, 
        title: req.body.title || "Nova Semana", 
        events: [] 
    };
    db.columns.push(newColumn);
    writeDB(db);
    res.status(201).json(newColumn);
});

app.delete('/api/columns/:columnId', (req, res) => {
    const db = readDB();
    const initialLength = db.columns.length;
    db.columns = db.columns.filter(c => c.id !== req.params.columnId);
    
    if (db.columns.length === initialLength) {
        return res.status(404).json({ error: 'Coluna não encontrada' });
    }
    
    writeDB(db);
    res.json({ message: 'Coluna excluída com sucesso' });
});

// ================= ROTAS DE EVENTOS (CARTÕES) =================

app.post('/api/columns/:columnId/events', (req, res) => {
    const db = readDB();
    const column = db.columns.find(c => c.id === req.params.columnId);
    if (!column) return res.status(404).json({ error: 'Coluna não encontrada' });

    const newEvent = {
        id: `evt-${Date.now()}`,
        name: req.body.name || "Novo Culto",
        date: req.body.date || "A definir",
        description: req.body.description || "",
        notes: req.body.notes || "",
        roles: req.body.roles || []
    };
    column.events.push(newEvent);
    writeDB(db);
    res.status(201).json(newEvent);
});

app.put('/api/columns/:columnId/events/:eventId', (req, res) => {
    const db = readDB();
    const column = db.columns.find(c => c.id === req.params.columnId);
    if (!column) return res.status(404).json({ error: 'Coluna não encontrada' });

    const eventIndex = column.events.findIndex(e => e.id === req.params.eventId);
    if (eventIndex === -1) return res.status(404).json({ error: 'Evento não encontrado' });

    column.events[eventIndex] = { ...column.events[eventIndex], ...req.body };
    writeDB(db);
    res.json(column.events[eventIndex]);
});

app.delete('/api/columns/:columnId/events/:eventId', (req, res) => {
    const db = readDB();
    const column = db.columns.find(c => c.id === req.params.columnId);
    if (!column) return res.status(404).json({ error: 'Coluna não encontrada' });

    const initialLength = column.events.length;
    column.events = column.events.filter(e => e.id !== req.params.eventId);

    if (column.events.length === initialLength) {
        return res.status(404).json({ error: 'Evento não encontrado' });
    }

    writeDB(db);
    res.json({ message: 'Evento excluído com sucesso' });
});

// ================= START =================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});