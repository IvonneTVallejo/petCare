/**
 * Validates tutor data fields.
 * @param {Object} datos - { nombre, telefono, direccion, correo }
 * @returns {{ valido: boolean, errores: Array<{campo: string, mensaje: string}> }}
 */
export function validarDatosTutor(datos) {
    const errores = [];
    if (!datos.nombre || !datos.nombre.trim()) errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio' });
    if (!datos.telefono || !/^\d{7,15}$/.test(datos.telefono)) errores.push({ campo: 'telefono', mensaje: 'Teléfono inválido (7-15 dígitos)' });
    if (!datos.direccion || !datos.direccion.trim()) errores.push({ campo: 'direccion', mensaje: 'La dirección es obligatoria' });
    if (!datos.correo || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(datos.correo)) errores.push({ campo: 'correo', mensaje: 'Correo inválido' });
    return { valido: errores.length === 0, errores };
}
