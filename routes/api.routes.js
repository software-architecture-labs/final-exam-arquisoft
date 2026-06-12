const express = require('express');
const router = express.Router();

const hcController = require('../controllers/historiaClinica.controller');
const doctorController = require('../controllers/doctor.controller');

/**
 * Middleware de versionamiento por Accept Header.
 * Formatos aceptados:
 *   application/json
 *   application/* (wildcard)
 *   application/vnd.hospital.v{n}+json
 */
function validarAccept(req, res, next) {
  const accept = req.headers['accept'] || '';
  const valido =
    accept.includes('application/json') ||
    accept.includes('*/*') ||
    accept === '' ||
    /application\/vnd\.hospital\.v\d+\+json/.test(accept);

  if (!valido) {
    return res.status(406).json({
      status: 406,
      error: 'Not Acceptable',
      message: 'El header Accept debe ser application/json o application/vnd.hospital.v{n}+json'
    });
  }
  next();
}

router.use(validarAccept);

// 1. GET historia clínica básica por cédula de paciente
router.get('/pacientes/:cedula/historia-clinica', hcController.getHistoriaPorCedula);

// 2. POST registrar nueva historia clínica
router.post('/historias-clinicas', hcController.crearHistoriaClinica);

// GET detalle de una historia clínica por ID (soporte HATEOAS)
router.get('/historias-clinicas/:id', hcController.getHistoriaPorId);

// GET listado de doctores
router.get('/doctores', doctorController.getDoctores);

module.exports = router;
