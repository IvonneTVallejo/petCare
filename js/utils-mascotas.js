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
