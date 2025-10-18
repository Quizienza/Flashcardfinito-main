import express from 'express';
import fs from 'fs';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const app = express();
const PORT = 3001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Servi file statici dalla cartella public
app.use('/public', express.static(path.join(__dirname, 'public')));

function extractQuestionsFromJS(fileContent) {
    console.log('🔍 Estrazione domande da file JS con vm...');
    
    const context = {
        window: {},
        console: console
    };
    
    try {
        vm.createContext(context);
        vm.runInContext(fileContent, context);
        
        if (Array.isArray(context.window.questions)) {
            console.log('✅ Estrazione con vm completata');
            return context.window.questions;
        } else {
            throw new Error('window.questions non è un array');
        }
    } catch (error) {
        console.error('❌ Errore nell\'esecuzione con vm:', error);
        throw new Error(`Impossibile estrarre le domande: ${error.message}`);
    }
}

app.get('/api/questions/:filename', (req, res) => {
    const filename = req.params.filename;
    
    const possiblePaths = [
        path.join(__dirname, 'public', filename),
        path.join(__dirname, filename),
        path.join(process.cwd(), 'public', filename),
        path.join(process.cwd(), filename)
    ];
    
    let filePath = null;
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }
    
    if (!filePath) {
        return res.status(404).json({ 
            error: 'File non trovato',
            searchedPaths: possiblePaths
        });
    }
    
    console.log('📁 File trovato:', filePath);
    
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log('📄 Dimensione file:', fileContent.length, 'caratteri');
        
        const questions = extractQuestionsFromJS(fileContent);
        
        if (!Array.isArray(questions)) {
            throw new Error('Le domande estratte non sono un array');
        }
        
        console.log(`✅ Caricate ${questions.length} domande`);
        
        res.json(questions);
        
    } catch (error) {
        console.error('❌ Errore:', error);
        res.status(500).json({ 
            error: error.message,
            suggestion: 'Verifica che il file contenga: window.questions = [...];'
        });
    }
});

app.post('/api/save-questions', (req, res) => {
    const { filename, questions } = req.body;
    
    if (!filename || !questions) {
        return res.status(400).json({ error: 'Dati mancanti' });
    }
    
    const filePath = path.join(__dirname, 'public', filename);
    const fileContent = `window.questions = ${JSON.stringify(questions, null, 4)};`;
    
    try {
        fs.writeFileSync(filePath, fileContent, 'utf8');
        res.json({ success: true, message: 'File salvato correttamente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        directory: __dirname 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server avviato su http://localhost:${PORT}`);
    console.log(`📂 Directory: ${__dirname}`);
});