/**
 * Truncates text to a maximum length, appending "..." if truncated.
 * @param {string} texto - The text to truncate
 * @param {number} max - Maximum character length
 * @returns {string}
 */
export function truncarTexto(texto, max) {
    if (!texto || typeof texto !== 'string') return '';
    if (texto.length <= max) return texto;
    return texto.substring(0, max) + '...';
}

/**
 * Validates that a file does not exceed 5 MB.
 * @param {{ size: number, name: string }} file
 * @returns {{ valido: boolean, error: string|null }}
 */
export function validarArchivoAdjunto(file) {
    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
        return { valido: false, error: `El archivo "${file.name}" excede 5 MB` };
    }
    return { valido: true, error: null };
}

/**
 * Validates that seguimiento text is not empty or whitespace-only.
 * @param {string} texto
 * @returns {{ valido: boolean, error: string|null }}
 */
export function validarTextoSeguimiento(texto) {
    if (!texto || typeof texto !== 'string' || !texto.trim()) {
        return { valido: false, error: 'El campo seguimiento es obligatorio' };
    }
    return { valido: true, error: null };
}

/**
 * Renders the "Finalizar" button HTML only if consultation state is 1 (Abierta).
 * @param {{ cm_id_consulta: number, cm_ec_id_estado: number }} consulta
 * @returns {string} HTML string
 */
export function renderBotonFinalizar(consulta) {
    if (consulta.cm_ec_id_estado === 1) {
        return `<button type="button" class="btn btn-warning btn-accion btn-finalizar-consulta" data-id="${consulta.cm_id_consulta}" title="Finalizar consulta">🔒</button>`;
    }
    return '';
}

/**
 * Returns true only if the current state allows finalization (state = 1).
 * @param {number} estadoActual
 * @returns {boolean}
 */
export function puedeFinalizarConsulta(estadoActual) {
    return estadoActual === 1;
}


/**
 * Valida el rango de fechas del historial médico.
 * @param {string} fechaInicio - Fecha inicio en formato YYYY-MM-DD
 * @param {string|null} fechaFin - Fecha fin en formato YYYY-MM-DD o null
 * @returns {{ valido: boolean, error: string|null, fechaFinEfectiva: string }}
 */
export function validarRangoFechasHistorial(fechaInicio, fechaFin) {
    if (!fechaInicio || typeof fechaInicio !== 'string' || !fechaInicio.trim()) {
        return { valido: false, error: 'La fecha inicial es obligatoria', fechaFinEfectiva: '' };
    }

    const hoy = new Date();
    const fechaHoy = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    const fechaFinEfectiva = (fechaFin && typeof fechaFin === 'string' && fechaFin.trim())
        ? fechaFin.trim()
        : fechaHoy;

    if (fechaInicio.trim() > fechaFinEfectiva) {
        return { valido: false, error: 'La fecha inicial debe ser anterior o igual a la fecha final', fechaFinEfectiva };
    }

    return { valido: true, error: null, fechaFinEfectiva };
}

/**
 * Unifica y ordena cronológicamente todos los eventos clínicos.
 * @param {object} datos - { consultas, vacunaciones, hospitalizaciones, seguimientos }
 * @returns {Array<{tipo: string, fecha: string, datos: object}>} - Lista ordenada por fecha ascendente
 */
export function unificarEventosClinicos(datos) {
    const eventos = [];

    if (datos.consultas && Array.isArray(datos.consultas)) {
        datos.consultas.forEach(c => {
            eventos.push({
                tipo: 'consulta',
                fecha: c.fecha || '',
                datos: c
            });
        });
    }

    if (datos.vacunaciones && Array.isArray(datos.vacunaciones)) {
        datos.vacunaciones.forEach(v => {
            eventos.push({
                tipo: 'vacunacion',
                fecha: v.fecha || '',
                datos: v
            });
        });
    }

    if (datos.hospitalizaciones && Array.isArray(datos.hospitalizaciones)) {
        datos.hospitalizaciones.forEach(h => {
            eventos.push({
                tipo: 'hospitalizacion',
                fecha: h.fecha || '',
                datos: h
            });
        });
    }

    if (datos.seguimientos && Array.isArray(datos.seguimientos)) {
        datos.seguimientos.forEach(s => {
            eventos.push({
                tipo: 'seguimiento',
                fecha: s.fecha || '',
                datos: s
            });
        });
    }

    eventos.sort((a, b) => {
        if (a.fecha < b.fecha) return -1;
        if (a.fecha > b.fecha) return 1;
        return 0;
    });

    return eventos;
}

/**
 * Calcula la edad de la mascota a partir de su fecha de nacimiento.
 * @param {string} fechaNacimiento - Fecha en formato YYYY-MM-DD
 * @returns {string} - Edad formateada (ej: "3 años 2 meses")
 */
export function calcularEdadMascota(fechaNacimiento) {
    if (!fechaNacimiento || typeof fechaNacimiento !== 'string') return '—';

    const partes = fechaNacimiento.trim().split(' ')[0].split('-');
    if (partes.length < 3) return '—';

    const nacimiento = new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
    const hoy = new Date();

    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();

    if (hoy.getDate() < nacimiento.getDate()) {
        meses--;
    }

    if (meses < 0) {
        anios--;
        meses += 12;
    }

    if (anios <= 0 && meses <= 0) {
        return '< 1 mes';
    }

    let resultado = '';
    if (anios > 0) {
        resultado += anios + (anios === 1 ? ' año' : ' años');
    }
    if (meses > 0) {
        if (resultado) resultado += ' ';
        resultado += meses + (meses === 1 ? ' mes' : ' meses');
    }

    return resultado || '< 1 mes';
}

/**
 * Genera el nombre del archivo PDF.
 * @param {string} nombreMascota - Nombre de la mascota
 * @returns {string} - Nombre formato "Historial_{Nombre}_{YYYY-MM-DD}.pdf"
 */
export function generarNombreArchivoPDF(nombreMascota) {
    const hoy = new Date();
    const fecha = hoy.getFullYear() + '-' +
        String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoy.getDate()).padStart(2, '0');

    const nombre = (nombreMascota && typeof nombreMascota === 'string')
        ? nombreMascota.trim().replace(/\s+/g, '_')
        : 'Mascota';

    return `Historial_${nombre}_${fecha}.pdf`;
}
