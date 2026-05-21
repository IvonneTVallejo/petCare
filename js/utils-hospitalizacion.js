// ================= UTILS HOSPITALIZACIÓN =================
// Funciones puras exportables para testing sin dependencias del DOM o Supabase

// ================= VALIDACIONES =================

/**
 * Valida que los campos obligatorios del formulario estén completos
 * @param {object} datos - {mascotaId, fechaIngreso}
 * @returns {{valido: boolean, errores: string[]}}
 */
export function validarFormularioHospitalizacion(datos) {
    const errores = [];

    if (!datos.mascotaId || datos.mascotaId === 0 || datos.mascotaId === '' || datos.mascotaId === '0') {
        errores.push('Debe seleccionar un paciente');
    }

    if (!datos.fechaIngreso || datos.fechaIngreso === '') {
        errores.push('La fecha de ingreso es obligatoria');
    }

    return {
        valido: errores.length === 0,
        errores
    };
}

/**
 * Valida formato de hora HH:MM
 * @param {string} hora
 * @returns {boolean}
 */
export function validarFormatoHora(hora) {
    if (typeof hora !== 'string') return false;
    const regex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return regex.test(hora);
}

/**
 * Valida que un valor numérico sea entero no negativo
 * @param {*} valor
 * @returns {boolean}
 */
export function validarEnteroNoNegativo(valor) {
    const num = Number(valor);
    return Number.isInteger(num) && num >= 0;
}

// ================= AUTOCOMPLETAR =================

/**
 * Filtra productos por nombre para autocompletar
 * @param {string} termino - Texto de búsqueda
 * @param {object[]} productos - Lista de productos
 * @returns {object[]} Productos que coinciden
 */
export function filtrarProductosPorNombre(termino, productos) {
    if (!termino || termino.trim() === '') return [];
    if (!Array.isArray(productos)) return [];

    const terminoLower = termino.toLowerCase().trim();
    return productos.filter(p => {
        const nombre = (p.pr_nombre || p.nombre || '').toLowerCase();
        return nombre.includes(terminoLower);
    });
}

/**
 * Mapea datos de mascota y cliente a campos del formulario
 * @param {object} mascota - Registro de datos_mascota
 * @param {object} cliente - Registro de datos_cliente
 * @returns {object} Campos autocompletados {edad, raza, propietario, telefono}
 */
export function mapearDatosPaciente(mascota, cliente) {
    let edad = '';
    if (mascota && mascota.dm_fecha_nacimiento) {
        const nacimiento = new Date(mascota.dm_fecha_nacimiento);
        const hoy = new Date();
        const diffMs = hoy - nacimiento;
        const diffAnios = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25));
        const diffMeses = Math.floor((diffMs % (1000 * 60 * 60 * 24 * 365.25)) / (1000 * 60 * 60 * 24 * 30.44));

        if (diffAnios > 0) {
            edad = `${diffAnios} año${diffAnios > 1 ? 's' : ''}`;
            if (diffMeses > 0) {
                edad += ` ${diffMeses} mes${diffMeses > 1 ? 'es' : ''}`;
            }
        } else {
            const totalMeses = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
            edad = `${totalMeses} mes${totalMeses !== 1 ? 'es' : ''}`;
        }
    }

    return {
        edad,
        raza: (mascota && mascota.dm_raza) || '',
        propietario: (cliente && cliente.dc_nombre) || '',
        telefono: (cliente && cliente.dc_telefono) || ''
    };
}

// ================= ALERTAS CLÍNICAS =================

/**
 * Evalúa si un valor de temperatura está fuera de rango
 * @param {number} temperatura
 * @returns {'normal'|'danger'}
 */
export function evaluarAlertaTemperatura(temperatura) {
    if (typeof temperatura !== 'number' || isNaN(temperatura)) return 'normal';
    if (temperatura < 37.5 || temperatura > 39.5) return 'danger';
    return 'normal';
}

/**
 * Evalúa si un conteo (vómitos/diarreas) supera el umbral de alerta
 * @param {number} conteo
 * @param {number} umbral - Default 3
 * @returns {'normal'|'danger'}
 */
export function evaluarAlertaConteo(conteo, umbral = 3) {
    if (typeof conteo !== 'number' || isNaN(conteo)) return 'normal';
    if (conteo >= umbral) return 'danger';
    return 'normal';
}

/**
 * Evalúa si el campo "tomó agua" requiere alerta
 * @param {boolean} tomoAgua
 * @returns {'normal'|'warning'}
 */
export function evaluarAlertaHidratacion(tomoAgua) {
    if (tomoAgua === false) return 'warning';
    return 'normal';
}

// ================= ORDENAMIENTO Y FILTROS =================

/**
 * Ordena hospitalizaciones: activas primero, luego por fecha descendente
 * @param {object[]} hospitalizaciones
 * @returns {object[]} Lista ordenada
 */
export function ordenarHospitalizaciones(hospitalizaciones) {
    if (!Array.isArray(hospitalizaciones)) return [];

    return [...hospitalizaciones].sort((a, b) => {
        // Activas primero
        if (a.h_estado === 'activa' && b.h_estado !== 'activa') return -1;
        if (a.h_estado !== 'activa' && b.h_estado === 'activa') return 1;

        // Dentro del mismo grupo, por fecha descendente
        const fechaA = new Date(a.h_fecha_ingreso || 0);
        const fechaB = new Date(b.h_fecha_ingreso || 0);
        return fechaB - fechaA;
    });
}

/**
 * Filtra hospitalizaciones por término de búsqueda (paciente o propietario)
 * @param {object[]} hospitalizaciones - Lista con datos de paciente/propietario
 * @param {string} termino - Texto de búsqueda
 * @returns {object[]} Lista filtrada
 */
export function filtrarPorBusqueda(hospitalizaciones, termino) {
    if (!termino || termino.trim() === '') return hospitalizaciones || [];
    if (!Array.isArray(hospitalizaciones)) return [];

    const terminoLower = termino.toLowerCase().trim();
    return hospitalizaciones.filter(h => {
        const paciente = (h.datos_mascota?.dm_nombre || h.paciente || '').toLowerCase();
        const propietario = (h.datos_cliente?.dc_nombre || h.propietario || '').toLowerCase();
        return paciente.includes(terminoLower) || propietario.includes(terminoLower);
    });
}

/**
 * Filtra hospitalizaciones por estado
 * @param {object[]} hospitalizaciones
 * @param {string} estado - 'activa' | 'finalizada' | 'todas'
 * @returns {object[]} Lista filtrada
 */
export function filtrarPorEstadoFn(hospitalizaciones, estado) {
    if (!Array.isArray(hospitalizaciones)) return [];
    if (!estado || estado === 'todas') return [...hospitalizaciones];
    return hospitalizaciones.filter(h => h.h_estado === estado);
}

// ================= MEDICAMENTOS =================

/**
 * Agrega un medicamento vacío a la lista
 * @param {object[]} medicamentos - Lista actual
 * @returns {object[]} Nueva lista con medicamento agregado
 */
export function agregarMedicamentoALista(medicamentos) {
    const lista = Array.isArray(medicamentos) ? medicamentos : [];
    return [
        ...lista,
        {
            id: null,
            nombre: '',
            dosis: '',
            via: '',
            ml: '',
            orden: lista.length,
            activo: true
        }
    ];
}

/**
 * Remueve un medicamento de la lista por índice
 * @param {object[]} medicamentos - Lista actual
 * @param {number} indice
 * @returns {object[]} Nueva lista sin el medicamento
 */
export function removerMedicamentoDeLista(medicamentos, indice) {
    if (!Array.isArray(medicamentos)) return [];
    if (indice < 0 || indice >= medicamentos.length) return [...medicamentos];
    return medicamentos.filter((_, i) => i !== indice);
}

/**
 * Duplica un medicamento existente
 * @param {object} medicamento - Medicamento a duplicar
 * @returns {object} Copia del medicamento (sin ID)
 */
export function duplicarMedicamentoObj(medicamento) {
    if (!medicamento) return { id: null, nombre: '', dosis: '', via: '', ml: '' };
    return {
        id: null,
        nombre: medicamento.nombre || medicamento.hm_nombre || '',
        dosis: medicamento.dosis || medicamento.hm_dosis || '',
        via: medicamento.via || medicamento.hm_via || '',
        ml: medicamento.ml || medicamento.hm_ml || ''
    };
}

// ================= EXPORTACIÓN =================

/**
 * Genera el nombre del archivo PDF
 * @param {string} nombrePaciente
 * @param {string} fechaIngreso - Formato YYYY-MM-DD
 * @returns {string} Nombre del archivo
 */
export function generarNombrePDF(nombrePaciente, fechaIngreso) {
    const nombre = (nombrePaciente || 'paciente')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');
    const fecha = fechaIngreso || 'sin-fecha';
    return `hospitalizacion_${nombre}_${fecha}.pdf`;
}

/**
 * Genera el resumen de una hospitalización para el historial
 * @param {object} hospitalizacion
 * @returns {object} {fechaIngreso, fechaEgreso, diagnostico, medico}
 */
export function generarResumenHospitalizacion(hospitalizacion) {
    if (!hospitalizacion) {
        return { fechaIngreso: '', fechaEgreso: '', diagnostico: '', medico: '' };
    }
    return {
        fechaIngreso: hospitalizacion.h_fecha_ingreso || '',
        fechaEgreso: hospitalizacion.h_fecha_egreso || '',
        diagnostico: hospitalizacion.h_observaciones || '',
        medico: hospitalizacion.h_medico_tratante || ''
    };
}

// ================= NOTAS DE EVOLUCIÓN =================

/**
 * Ordena notas cronológicamente (más antigua primero)
 * @param {object[]} notas - Lista de observaciones
 * @returns {object[]} Lista ordenada por fecha ascendente
 */
export function ordenarNotasCronologicamente(notas) {
    if (!Array.isArray(notas)) return [];
    return [...notas].sort((a, b) => {
        const fechaA = new Date(a.hobs_created_at || a.created_at || 0);
        const fechaB = new Date(b.hobs_created_at || b.created_at || 0);
        return fechaA - fechaB;
    });
}
