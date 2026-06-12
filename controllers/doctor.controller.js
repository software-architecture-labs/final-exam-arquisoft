const db = require('../config/db');

exports.getDoctores = (req, res) => {
  db.all(
    `SELECT cedula, nombres, apellidos, especialidad, registro_medico FROM doctores ORDER BY nombres`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ status: 500, error: 'Error interno', message: err.message });
      }
      const url = `${req.protocol}://${req.get('host')}`;
      return res.status(200).json({
        api_version: 'v1',
        total: rows.length,
        doctores: rows,
        _links: {
          self: { href: `${url}/api/doctores`, method: 'GET' }
        }
      });
    }
  );
};
