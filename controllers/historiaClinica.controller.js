const HistoriaClinicaModel = require('../models/historiaClinica.model');

function getApiVersion(req) {
  const accept = req.headers['accept'] || '';
  const match = accept.match(/application\/vnd\.hospital\.v(\d+)\+json/);
  if (match) return `v${match[1]}`;
  return 'v1';
}

function baseUrl(req) {
  return `${req.protocol}://${req.get('host')}`;
}

function buildPacienteLinks(req, cedula) {
  const url = baseUrl(req);
  return {
    self: { href: `${url}/api/pacientes/${cedula}/historia-clinica`, method: 'GET' },
    crear_historia: { href: `${url}/api/historias-clinicas`, method: 'POST' },
    doctores: { href: `${url}/api/doctores`, method: 'GET' }
  };
}

function buildHistoriaLinks(req, historiaId, cedulaPaciente) {
  const url = baseUrl(req);
  return {
    self: { href: `${url}/api/historias-clinicas/${historiaId}`, method: 'GET' },
    paciente: { href: `${url}/api/pacientes/${cedulaPaciente}/historia-clinica`, method: 'GET' }
  };
}

/**
 * GET /api/pacientes/:cedula/historia-clinica
 */
exports.getHistoriaPorCedula = async (req, res) => {
  try {
    const { cedula } = req.params;
    const version = getApiVersion(req);

    const resultado = await HistoriaClinicaModel.findByCedula(cedula);

    if (!resultado) {
      return res.status(404).json({
        status: 404,
        error: 'No encontrado',
        message: `No se encontró un paciente con cédula ${cedula}`,
        _links: {
          crear_historia: { href: `${baseUrl(req)}/api/historias-clinicas`, method: 'POST' }
        }
      });
    }

    const { paciente, historias } = resultado;

    const historiasFormateadas = historias.map((h) => ({
      id: h.id,
      fecha_registro: h.fecha_registro,
      motivo_consulta: h.motivo_consulta,
      sintomas: h.sintomas,
      diagnostico: h.diagnostico,
      tratamiento: h.tratamiento,
      observaciones: h.observaciones,
      signos_vitales: {
        presion_arterial: h.signos_vitales_presion,
        temperatura: h.signos_vitales_temperatura,
        frecuencia_cardiaca: h.signos_vitales_frecuencia_cardiaca
      },
      peso_kg: h.peso,
      altura_m: h.altura,
      medico: {
        nombre: `${h.doctor_nombres} ${h.doctor_apellidos}`,
        cedula: h.doctor_cedula,
        especialidad: h.doctor_especialidad
      },
      _links: buildHistoriaLinks(req, h.id, paciente.cedula)
    }));

    const responseBody = {
      api_version: version,
      paciente: {
        cedula: paciente.cedula,
        nombres: paciente.nombres,
        apellidos: paciente.apellidos,
        fecha_nacimiento: paciente.fecha_nacimiento,
        sexo: paciente.sexo,
        tipo_sangre: paciente.tipo_sangre,
        eps: paciente.eps
      },
      total_registros: historiasFormateadas.length,
      historias_clinicas: historiasFormateadas,
      _links: buildPacienteLinks(req, paciente.cedula)
    };

    // v2: incluye datos de contacto del paciente
    if (version === 'v2') {
      responseBody.paciente.telefono = paciente.telefono;
      responseBody.paciente.direccion = paciente.direccion;
    }

    return res.status(200).json(responseBody);
  } catch (error) {
    return res.status(500).json({ status: 500, error: 'Error interno', message: error.message });
  }
};

/**
 * POST /api/historias-clinicas
 */
exports.crearHistoriaClinica = async (req, res) => {
  try {
    const version = getApiVersion(req);
    const data = req.body;

    const camposObligatorios = [
      'cedula_paciente', 'nombres_paciente', 'apellidos_paciente',
      'cedula_medico', 'nombre_medico', 'fecha_registro', 'motivo_consulta', 'diagnostico'
    ];

    const faltantes = camposObligatorios.filter((c) => !data[c]);
    if (faltantes.length > 0) {
      return res.status(400).json({
        status: 400,
        error: 'Solicitud inválida',
        message: `Faltan campos obligatorios: ${faltantes.join(', ')}`
      });
    }

    const modelData = {
      ...data,
      cedula: data.cedula_medico,
      registro_medico: data.registro_medico_profesional
    };

    const resultado = await HistoriaClinicaModel.create(modelData);
    const nueva = await HistoriaClinicaModel.findById(resultado.id);

    return res.status(201).json({
      api_version: version,
      status: 201,
      message: 'Historia clínica registrada exitosamente',
      data: {
        id: nueva.id,
        fecha_registro: nueva.fecha_registro,
        paciente: {
          cedula: nueva.paciente_cedula,
          nombres: nueva.paciente_nombres,
          apellidos: nueva.paciente_apellidos
        },
        medico_responsable: {
          cedula: nueva.doctor_cedula,
          nombre: `${nueva.doctor_nombres} ${nueva.doctor_apellidos}`
        },
        diagnostico: nueva.diagnostico
      },
      _links: {
        self: { href: `${baseUrl(req)}/api/historias-clinicas/${nueva.id}`, method: 'GET' },
        paciente: { href: `${baseUrl(req)}/api/pacientes/${nueva.paciente_cedula}/historia-clinica`, method: 'GET' }
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: 'Error interno', message: error.message });
  }
};

/**
 * GET /api/historias-clinicas/:id
 */
exports.getHistoriaPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const version = getApiVersion(req);
    const h = await HistoriaClinicaModel.findById(id);

    if (!h) {
      return res.status(404).json({
        status: 404,
        error: 'No encontrado',
        message: `Historia clínica ${id} no existe`
      });
    }

    return res.status(200).json({
      api_version: version,
      id: h.id,
      fecha_registro: h.fecha_registro,
      motivo_consulta: h.motivo_consulta,
      sintomas: h.sintomas,
      diagnostico: h.diagnostico,
      tratamiento: h.tratamiento,
      observaciones: h.observaciones,
      signos_vitales: {
        presion_arterial: h.signos_vitales_presion,
        temperatura: h.signos_vitales_temperatura,
        frecuencia_cardiaca: h.signos_vitales_frecuencia_cardiaca
      },
      peso_kg: h.peso,
      altura_m: h.altura,
      paciente: {
        cedula: h.paciente_cedula,
        nombres: h.paciente_nombres,
        apellidos: h.paciente_apellidos
      },
      medico: {
        cedula: h.doctor_cedula,
        nombre: `${h.doctor_nombres} ${h.doctor_apellidos}`
      },
      _links: buildHistoriaLinks(req, h.id, h.paciente_cedula)
    });
  } catch (error) {
    return res.status(500).json({ status: 500, error: 'Error interno', message: error.message });
  }
};
