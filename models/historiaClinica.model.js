const db = require('../config/db');

const HistoriaClinicaModel = {
  findByCedula: (cedula) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM pacientes WHERE cedula = ?`, [cedula], (err, paciente) => {
        if (err) return reject(err);
        if (!paciente) return resolve(null);

        const queryHistorias = `
          SELECT hc.*,
                 d.nombres AS doctor_nombres,
                 d.apellidos AS doctor_apellidos,
                 d.cedula AS doctor_cedula,
                 d.especialidad AS doctor_especialidad
          FROM historias_clinicas hc
          JOIN doctores d ON hc.doctor_id = d.id
          WHERE hc.paciente_id = ?
          ORDER BY hc.fecha_registro DESC
        `;
        db.all(queryHistorias, [paciente.id], (err2, historias) => {
          if (err2) return reject(err2);
          resolve({ paciente, historias });
        });
      });
    });
  },

  findOrCreateDoctor: (doctor) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM doctores WHERE cedula = ?`, [doctor.cedula], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row.id);

        const { cedula, nombre_medico, especialidad, registro_medico } = doctor;
        const partes = (nombre_medico || '').trim().split(' ');
        const mid = Math.ceil(partes.length / 2);
        const nombres = partes.slice(0, mid).join(' ') || nombre_medico;
        const apellidos = partes.slice(mid).join(' ') || '';

        db.run(
          `INSERT INTO doctores (cedula, nombres, apellidos, especialidad, registro_medico) VALUES (?, ?, ?, ?, ?)`,
          [cedula, nombres, apellidos, especialidad || null, registro_medico || null],
          function (err2) {
            if (err2) return reject(err2);
            resolve(this.lastID);
          }
        );
      });
    });
  },

  findOrCreatePaciente: (paciente) => {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM pacientes WHERE cedula = ?`, [paciente.cedula_paciente], (err, row) => {
        if (err) return reject(err);
        if (row) return resolve(row.id);

        const {
          cedula_paciente, nombres_paciente, apellidos_paciente,
          fecha_nacimiento, sexo, tipo_sangre, telefono, direccion, eps
        } = paciente;

        db.run(
          `INSERT INTO pacientes (cedula, nombres, apellidos, fecha_nacimiento, sexo, tipo_sangre, telefono, direccion, eps)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [cedula_paciente, nombres_paciente || 'N/A', apellidos_paciente || 'N/A',
           fecha_nacimiento || null, sexo || null, tipo_sangre || null,
           telefono || null, direccion || null, eps || null],
          function (err2) {
            if (err2) return reject(err2);
            resolve(this.lastID);
          }
        );
      });
    });
  },

  create: (data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const pacienteId = await HistoriaClinicaModel.findOrCreatePaciente(data);
        const doctorId = await HistoriaClinicaModel.findOrCreateDoctor(data);

        const {
          fecha_registro, motivo_consulta, sintomas, diagnostico, tratamiento, observaciones,
          signos_vitales_presion, signos_vitales_temperatura, signos_vitales_frecuencia_cardiaca,
          peso, altura
        } = data;

        db.run(
          `INSERT INTO historias_clinicas
           (paciente_id, doctor_id, fecha_registro, motivo_consulta, sintomas, diagnostico,
            tratamiento, observaciones, signos_vitales_presion, signos_vitales_temperatura,
            signos_vitales_frecuencia_cardiaca, peso, altura)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [pacienteId, doctorId, fecha_registro, motivo_consulta || null, sintomas || null,
           diagnostico || null, tratamiento || null, observaciones || null,
           signos_vitales_presion || null, signos_vitales_temperatura || null,
           signos_vitales_frecuencia_cardiaca || null, peso || null, altura || null],
          function (err) {
            if (err) return reject(err);
            resolve({ id: this.lastID, paciente_id: pacienteId, doctor_id: doctorId });
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  },

  findById: (id) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT hc.*,
               p.cedula AS paciente_cedula, p.nombres AS paciente_nombres, p.apellidos AS paciente_apellidos,
               d.cedula AS doctor_cedula, d.nombres AS doctor_nombres, d.apellidos AS doctor_apellidos
        FROM historias_clinicas hc
        JOIN pacientes p ON hc.paciente_id = p.id
        JOIN doctores d ON hc.doctor_id = d.id
        WHERE hc.id = ?
      `;
      db.get(query, [id], (err, row) => {
        if (err) return reject(err);
        resolve(row || null);
      });
    });
  }
};

module.exports = HistoriaClinicaModel;
