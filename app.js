const express = require('express');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar base de datos
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        telefono VARCHAR(20),
        edad INTEGER,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insertar datos de ejemplo si la tabla está vacía
    const result = await pool.query('SELECT COUNT(*) FROM usuarios');
    if (parseInt(result.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO usuarios (nombre, email, telefono, edad) VALUES
        ('Juan Pérez', 'juan@email.com', '555-0101', 28),
        ('María García', 'maria@email.com', '555-0102', 32),
        ('Carlos López', 'carlos@email.com', '555-0103', 25),
        ('Ana Martínez', 'ana@email.com', '555-0104', 30),
        ('Pedro Rodríguez', 'pedro@email.com', '555-0105', 35)
      `);
    }
    console.log('Base de datos inicializada correctamente');
  } catch (err) {
    console.error('Error al inicializar la base de datos:', err);
  }
}

// Rutas principales
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Routes

// Obtener todos los usuarios
app.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM usuarios ORDER BY id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// Obtener un usuario por ID
app.get('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM usuarios WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
});

// Crear nuevo usuario
app.post('/api/usuarios', async (req, res) => {
  try {
    const { nombre, email, telefono, edad } = req.body;
    
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    
    const result = await pool.query(
      'INSERT INTO usuarios (nombre, email, telefono, edad) VALUES ($1, $2, $3, $4) RETURNING *',
      [nombre, email, telefono, edad]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'El email ya está registrado' });
    } else {
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  }
});

// Actualizar usuario
app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, email, telefono, edad } = req.body;
    
    if (!nombre || !email) {
      return res.status(400).json({ error: 'Nombre y email son obligatorios' });
    }
    
    const result = await pool.query(
      'UPDATE usuarios SET nombre = $1, email = $2, telefono = $3, edad = $4 WHERE id = $5 RETURNING *',
      [nombre, email, telefono, edad, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') {
      res.status(400).json({ error: 'El email ya está registrado' });
    } else {
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  }
});

// Eliminar usuario
app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

// Inicializar servidor
async function startServer() {
  await initDB();
  app.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
  });
}

startServer().catch(console.error);
