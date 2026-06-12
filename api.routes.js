const express = require('express');
const router = express.Router();

const hcController = require('../controllers/historiaClinica.controller');
const doctorController = require('../controllers/doctor.controller');

// Middleware simple para validar el header Accept de versionamiento
function validarAccept(req, res, next) {
  const accept = req.headers['accept'] || '';
  const valido = accept.includes('application/json') ||
                  accept.includes('*/*') ||
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

// 1. GET historia clínica básica por cédula
router.get('/pacientes/:cedula/historia-clinica', hcController.getHistoriaPorCedula);

// 2. POST registrar historia clínica
router.post('/historias-clinicas', hcController.crearHistoriaClinica);

// GET detalle de una historia clínica específica (soporte HATEOAS)
router.get('/historias-clinicas/:id', hcController.getHistoriaPorId);

// Recurso auxiliar: listado de doctores
router.get('/doctores', doctorController.getDoctores);

module.exports = router;
