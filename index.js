import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do MySQL Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'reviseia',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));
app.use(helmet({
  contentSecurityPolicy: false, // Desativado para facilitar assets via scripts externos se necessário, mas pode ser ajustado
}));

// API Routes
const api = express.Router();

// GET /api/health
api.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'NodeJS/Express' });
});

// GET /api/tracks
api.get('/tracks', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        lt.id, lt.name, lt.slug, lt.description, lt.track_type, lt.is_default, lt.published,
        ee.title AS exam_edition_title, eb.name AS board_name
      FROM learning_tracks lt
      INNER JOIN exam_editions ee ON ee.id = lt.exam_edition_id
      INNER JOIN exam_boards eb ON eb.id = ee.exam_board_id
      ORDER BY lt.is_default DESC, lt.name
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tracks:', error);
    res.status(500).json({ error: 'Erro ao buscar trilhas' });
  }
});

// GET /api/tracks/:id
api.get('/tracks/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        lt.id, lt.name, lt.slug, lt.description, lt.track_type, lt.is_default, lt.published,
        ee.id AS exam_edition_id, ee.title AS exam_edition_title, eb.name AS board_name
      FROM learning_tracks lt
      INNER JOIN exam_editions ee ON ee.id = lt.exam_edition_id
      INNER JOIN exam_boards eb ON eb.id = ee.exam_board_id
      WHERE lt.id = ?
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Trilha não encontrada' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar trilha' });
  }
});

// GET /api/tracks/:id/items
api.get('/tracks/:id/items', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        lti.id, lti.display_order, lti.estimated_minutes, lti.item_type, lti.is_required,
        s.name AS subject_name, m.id AS material_id, m.title AS material_title, m.base_number
      FROM learning_track_items lti
      LEFT JOIN subjects s ON s.id = lti.subject_id
      LEFT JOIN materials m ON m.id = lti.material_id
      WHERE lti.learning_track_id = ?
      ORDER BY lti.display_order, lti.id
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar itens da trilha' });
  }
});

// GET /api/materials/:id
api.get('/materials/:id', async (req, res) => {
  const materialId = req.params.id;
  try {
    const [[material]] = await pool.query(`
      SELECT m.*, s.name AS subject_name 
      FROM materials m 
      LEFT JOIN subjects s ON s.id = m.subject_id 
      WHERE m.id = ?
    `, [materialId]);

    if (!material) return res.status(404).json({ error: 'Material não encontrado' });

    const [topics] = await pool.query('SELECT * FROM material_topics WHERE material_id = ? ORDER BY display_order, id', [materialId]);
    const [blocks] = await pool.query('SELECT * FROM material_blocks WHERE material_id = ? ORDER BY display_order, id', [materialId]);
    const [traps] = await pool.query('SELECT * FROM material_traps WHERE material_id = ? ORDER BY display_order, id', [materialId]);
    const [memory_points] = await pool.query('SELECT * FROM material_memory_points WHERE material_id = ? ORDER BY display_order, id', [materialId]);
    const [checklist] = await pool.query('SELECT * FROM material_checklists WHERE material_id = ? ORDER BY display_order, id', [materialId]);
    const [summary_items] = await pool.query('SELECT * FROM material_summary_items WHERE material_id = ? ORDER BY display_order, id', [materialId]);

    res.json({
      material,
      topics,
      blocks,
      traps,
      memory_points,
      checklist,
      summary_items
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar material' });
  }
});

// GET /api/materials/:id/questions
api.get('/materials/:id/questions', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT * FROM material_questions WHERE material_id = ? ORDER BY id
    `, [req.params.id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar questões' });
  }
});

// POST /api/users
api.post('/users', async (req, res) => {
  const { name, email, password_hash } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(409).json({ error: 'E-mail já cadastrado' });

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, status) VALUES (?, ?, ?, "active")',
      [name, email, password_hash]
    );
    res.json({ id: result.insertId, message: 'Usuário criado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// POST /api/users/:userId/subscriptions
api.post('/users/:userId/subscriptions', async (req, res) => {
  const { exam_edition_id, learning_track_id, status = 'active' } = req.body;
  const userId = req.params.userId;
  try {
    const [result] = await pool.query(
      'INSERT INTO user_exam_subscriptions (user_id, exam_edition_id, learning_track_id, started_at, status) VALUES (?, ?, ?, NOW(), ?)',
      [userId, exam_edition_id, learning_track_id, status]
    );
    res.json({ id: result.insertId, message: 'Assinatura criada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar assinatura' });
  }
});

// POST /api/users/:userId/materials/:materialId/progress
api.post('/users/:userId/materials/:materialId/progress', async (req, res) => {
  const { userId, materialId } = req.params;
  const { status, progress_percent } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM user_material_progress WHERE user_id = ? AND material_id = ?', [userId, materialId]);
    const completed_at = status === 'completed' ? new Date() : null;

    if (existing.length > 0) {
      await pool.query(
        'UPDATE user_material_progress SET status = ?, progress_percent = ?, last_access_at = NOW(), completed_at = ? WHERE id = ?',
        [status, progress_percent, completed_at, existing[0].id]
      );
      return res.json({ id: existing[0].id, message: 'Progresso atualizado' });
    }

    const [result] = await pool.query(
      'INSERT INTO user_material_progress (user_id, material_id, status, progress_percent, last_access_at, completed_at) VALUES (?, ?, ?, ?, NOW(), ?)',
      [userId, materialId, status, progress_percent, completed_at]
    );
    res.json({ id: result.insertId, message: 'Progresso criado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar progresso' });
  }
});

// POST /api/users/:userId/questions/:questionId/attempt
api.post('/users/:userId/questions/:questionId/attempt', async (req, res) => {
  const { userId, questionId } = req.params;
  const { selected_answer, is_correct, response_time_seconds, confidence_before_answer } = req.body;
  try {
    const [result] = await pool.query(`
      INSERT INTO user_question_attempts 
      (user_id, material_question_id, selected_answer, is_correct, answered_at, response_time_seconds, confidence_before_answer)
      VALUES (?, ?, ?, ?, NOW(), ?, ?)
    `, [userId, questionId, selected_answer, is_correct ? 1 : 0, response_time_seconds, confidence_before_answer]);
    res.json({ id: result.insertId, message: 'Tentativa registrada' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registrar tentativa' });
  }
});

// POST /api/users/:userId/checklists/:checklistId
api.post('/users/:userId/checklists/:checklistId', async (req, res) => {
  const { userId, checklistId } = req.params;
  const { checked } = req.body;
  try {
    const [existing] = await pool.query('SELECT id FROM user_checklist_progress WHERE user_id = ? AND material_checklist_id = ?', [userId, checklistId]);
    const checked_at = checked ? new Date() : null;

    if (existing.length > 0) {
      await pool.query(
        'UPDATE user_checklist_progress SET checked = ?, checked_at = ? WHERE id = ?',
        [checked ? 1 : 0, checked_at, existing[0].id]
      );
      return res.json({ id: existing[0].id, message: 'Checklist atualizado' });
    }

    const [result] = await pool.query(
      'INSERT INTO user_checklist_progress (user_id, material_checklist_id, checked, checked_at) VALUES (?, ?, ?, ?)',
      [userId, checklistId, checked ? 1 : 0, checked_at]
    );
    res.json({ id: result.insertId, message: 'Checklist criado' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar checklist' });
  }
});

// Mount /api
app.use('/api', api);

// Serve Static Files
// Use path.join to avoid issues on windows vs linux
const buildPath = path.join(__dirname, 'dist');
app.use(express.static(buildPath));

// SPA Fallback: Qualquer rota que não comece com /api deve servir o index.html
app.get('*', (req, res) => {
  if (req.originalUrl.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n==========================================`);
  console.log(`🚀 REVIVE IA - Servidor NodeJS Ativo`);
  console.log(`🏠 Porta: ${PORT}`);
  console.log(`📦 Status: Produção pronto`);
  console.log(`==========================================\n`);
});
