const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'hospital.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite:', dbPath);
  }
});

// Inicialización del esquema
db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON`);

  // Entidad Paciente
  db.run(`
    CREATE TABLE IF NOT EXISTS pacientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      fecha_nacimiento TEXT,
      sexo TEXT,
      tipo_sangre TEXT,
      telefono TEXT,
      direccion TEXT,
      eps TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Entidad Doctor
  db.run(`
    CREATE TABLE IF NOT EXISTS doctores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cedula TEXT UNIQUE NOT NULL,
      nombres TEXT NOT NULL,
      apellidos TEXT NOT NULL,
      especialidad TEXT,
      registro_medico TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Entidad Historia Clínica
  db.run(`
    CREATE TABLE IF NOT EXISTS historias_clinicas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      paciente_id INTEGER NOT NULL,
      doctor_id INTEGER NOT NULL,
      fecha_registro TEXT NOT NULL,
      motivo_consulta TEXT,
      sintomas TEXT,
      diagnostico TEXT,
      tratamiento TEXT,
      observaciones TEXT,
      signos_vitales_presion TEXT,
      signos_vitales_temperatura TEXT,
      signos_vitales_frecuencia_cardiaca TEXT,
      peso REAL,
      altura REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
      FOREIGN KEY (doctor_id) REFERENCES doctores(id)
    )
  `);

  // Seed: datos de ejemplo
  db.get(`SELECT COUNT(*) as count FROM pacientes`, (err, row) => {
    if (row && row.count === 0) {
      db.run(`INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, tipo_sangre, telefono, direccion, eps)
              VALUES ('1020304050', 'Juan Carlos', 'Pérez Gómez', '1990-05-12', 'M', 'O+', '3001234567', 'Calle 10 # 20-30, Medellín', 'Sura')`);

      db.run(`INSERT INTO doctores (cedula, nombres, apellidos, especialidad, registro_medico)
              VALUES ('900100200', 'Laura', 'Martínez', 'Medicina General', 'RM-12345')`, function () {
        const doctorId = this.lastID;
        db.get(`SELECT id FROM pacientes WHERE cedula = '1020304050'`, (err2, paciente) => {
          if (paciente) {
            db.run(`INSERT INTO historias_clinicas
                    (paciente_id, doctor_id, fecha_registro, motivo_consulta, sintomas, diagnostico, tratamiento, observaciones,
                     signos_vitales_presion, signos_vitales_temperatura, signos_vitales_frecuencia_cardiaca, peso, altura)
                    VALUES (?, ?, '2026-06-10', 'Dolor de cabeza persistente', 'Cefalea, mareo', 'Migraña tensional',
                            'Acetaminofén 500mg cada 8 horas por 3 días', 'Paciente refiere estrés laboral',
                            '120/80', '36.8', '78', 75.5, 1.78)`,
              [paciente.id, doctorId]);
          }
        });
      });
    }
  });
});

module.exports = db;
