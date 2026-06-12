/**
 * tests/api.test.js
 * Pruebas funcionales de la API de Historias Clínicas
 * Ejecutar con: node tests/api.test.js
 * (Requiere que el servidor esté corriendo en http://localhost:3000)
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

let passed = 0;
let failed = 0;
const results = [];

// ─── utilidades ────────────────────────────────────────────────────────────

async function request(method, path, { body, accept } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: accept || 'application/vnd.hospital.v1+json',
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, body: json };
}

function assert(description, condition) {
  if (condition) {
    passed++;
    results.push(`  ✅  ${description}`);
  } else {
    failed++;
    results.push(`  ❌  ${description}`);
  }
}

// ─── suite de pruebas ──────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🏥  HC-API — Suite de pruebas funcionales\n');

  // ── Health check ──────────────────────────────────────────────────────────
  console.log('▶  Health check');
  {
    const { status, body } = await request('GET', '/health');
    assert('Responde 200', status === 200);
    assert('Status es UP', body?.status === 'UP');
  }

  // ── GET paciente existente ────────────────────────────────────────────────
  console.log('\n▶  GET /api/pacientes/:cedula/historia-clinica (paciente seed)');
  {
    const { status, body } = await request('GET', '/api/pacientes/1020304050/historia-clinica');
    assert('Responde 200', status === 200);
    assert('Devuelve api_version', !!body?.api_version);
    assert('Incluye datos del paciente', !!body?.paciente?.cedula);
    assert('Incluye array historias_clinicas', Array.isArray(body?.historias_clinicas));
    assert('Incluye _links (HATEOAS)', !!body?._links?.self);
    assert('Cada historia incluye _links', body?.historias_clinicas?.[0]?._links?.self);
    assert('Médico incluido en historia', !!body?.historias_clinicas?.[0]?.medico?.cedula);
  }

  // ── GET versión v2 ────────────────────────────────────────────────────────
  console.log('\n▶  GET v2 — datos de contacto del paciente');
  {
    const { status, body } = await request('GET', '/api/pacientes/1020304050/historia-clinica', {
      accept: 'application/vnd.hospital.v2+json',
    });
    assert('Responde 200', status === 200);
    assert('api_version es v2', body?.api_version === 'v2');
    assert('Incluye telefono en v2', body?.paciente?.telefono !== undefined);
    assert('Incluye direccion en v2', body?.paciente?.direccion !== undefined);
  }

  // ── GET paciente no existente ─────────────────────────────────────────────
  console.log('\n▶  GET paciente inexistente → 404');
  {
    const { status, body } = await request('GET', '/api/pacientes/9999999999/historia-clinica');
    assert('Responde 404', status === 404);
    assert('Mensaje de error presente', !!body?.message);
    assert('_links de creación presente', !!body?._links?.crear_historia);
  }

  // ── Accept Header inválido → 406 ──────────────────────────────────────────
  console.log('\n▶  Accept Header inválido → 406');
  {
    const { status } = await request('GET', '/api/pacientes/1020304050/historia-clinica', {
      accept: 'text/html',
    });
    assert('Responde 406', status === 406);
  }

  // ── POST crear historia clínica ───────────────────────────────────────────
  console.log('\n▶  POST /api/historias-clinicas — registro nuevo');
  const nuevaCedula = `TEST${Date.now()}`;
  let nuevaHistoriaId = null;
  {
    const payload = {
      cedula_paciente: nuevaCedula,
      nombres_paciente: 'María',
      apellidos_paciente: 'López Ruiz',
      fecha_nacimiento: '1985-03-22',
      sexo: 'F',
      tipo_sangre: 'A+',
      telefono: '3109876543',
      direccion: 'Carrera 5 # 10-20, Bogotá',
      eps: 'Nueva EPS',
      cedula_medico: '800200300',
      nombre_medico: 'Carlos Rodríguez',
      especialidad: 'Cardiología',
      registro_medico_profesional: 'RM-67890',
      fecha_registro: '2026-06-12',
      motivo_consulta: 'Dolor precordial',
      sintomas: 'Palpitaciones y fatiga',
      diagnostico: 'Arritmia leve',
      tratamiento: 'Reposo y seguimiento',
      observaciones: 'Control en 2 semanas',
      signos_vitales_presion: '130/85',
      signos_vitales_temperatura: '36.7',
      signos_vitales_frecuencia_cardiaca: '95',
      peso: 68.0,
      altura: 1.65,
    };

    const { status, body } = await request('POST', '/api/historias-clinicas', { body: payload });
    assert('Responde 201', status === 201);
    assert('Devuelve id de historia', !!body?.data?.id);
    assert('Devuelve _links HATEOAS', !!body?._links?.self);
    assert('Contiene paciente en respuesta', !!body?.data?.paciente?.cedula);
    assert('Contiene medico_responsable', !!body?.data?.medico_responsable?.cedula);
    nuevaHistoriaId = body?.data?.id;
  }

  // ── GET historia recién creada por cédula ─────────────────────────────────
  console.log('\n▶  GET paciente recién creado');
  {
    const { status, body } = await request('GET', `/api/pacientes/${nuevaCedula}/historia-clinica`);
    assert('Responde 200', status === 200);
    assert('Historia creada aparece en el listado', body?.total_registros >= 1);
  }

  // ── GET historia por ID ───────────────────────────────────────────────────
  if (nuevaHistoriaId) {
    console.log('\n▶  GET /api/historias-clinicas/:id');
    {
      const { status, body } = await request('GET', `/api/historias-clinicas/${nuevaHistoriaId}`);
      assert('Responde 200', status === 200);
      assert('ID coincide', body?.id === nuevaHistoriaId);
      assert('Contiene _links HATEOAS', !!body?._links?.self);
    }
  }

  // ── GET historia inexistente ──────────────────────────────────────────────
  console.log('\n▶  GET historia inexistente → 404');
  {
    const { status } = await request('GET', '/api/historias-clinicas/99999999');
    assert('Responde 404', status === 404);
  }

  // ── POST — campos obligatorios faltantes → 400 ────────────────────────────
  console.log('\n▶  POST sin campos obligatorios → 400');
  {
    const { status, body } = await request('POST', '/api/historias-clinicas', {
      body: { cedula_paciente: '000', nombres_paciente: 'Test' },
    });
    assert('Responde 400', status === 400);
    assert('Mensaje de error explica campos faltantes', body?.message?.includes('Faltan'));
  }

  // ── GET doctores ──────────────────────────────────────────────────────────
  console.log('\n▶  GET /api/doctores');
  {
    const { status, body } = await request('GET', '/api/doctores');
    assert('Responde 200', status === 200);
    assert('Devuelve array de doctores', Array.isArray(body?.doctores));
    assert('Incluye _links HATEOAS', !!body?._links?.self);
  }

  // ── Ruta no existente → 404 ───────────────────────────────────────────────
  console.log('\n▶  Ruta no existente → 404');
  {
    const { status } = await request('GET', '/api/ruta-inexistente');
    assert('Responde 404', status === 404);
  }

  // ─── Resumen ──────────────────────────────────────────────────────────────
  console.log('\n' + results.join('\n'));
  const total = passed + failed;
  console.log(`\n─────────────────────────────────────────`);
  console.log(`Resultado: ${passed}/${total} pruebas pasaron`);
  if (failed > 0) {
    console.log(`⚠️  ${failed} prueba(s) fallaron`);
    process.exit(1);
  } else {
    console.log('🎉  Todas las pruebas pasaron exitosamente');
  }
}

runTests().catch((err) => {
  console.error('\n❌  Error ejecutando pruebas:', err.message);
  console.error('¿Está el servidor corriendo en', BASE_URL, '?');
  process.exit(1);
});
