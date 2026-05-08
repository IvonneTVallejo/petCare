import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validarDatosTutor } from '../js/utils-pacientes.js';

/**
 * **Validates: Requirements 1.3**
 * Propiedad 1: Validación de datos del tutor acepta solo entradas válidas
 */
describe('validarDatosTutor - Property-Based Tests', () => {

    // Generators for valid data
    const validNombre = fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
    const validTelefono = fc.stringOf(fc.constantFrom('0','1','2','3','4','5','6','7','8','9'), { minLength: 7, maxLength: 15 });
    const validDireccion = fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0);
    const validCorreo = fc.tuple(
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._+-'.split('')), { minLength: 1, maxLength: 20 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789.-'.split('')), { minLength: 1, maxLength: 15 }),
        fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), { minLength: 2, maxLength: 6 })
    ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

    it('retorna valido=true para datos válidos', () => {
        fc.assert(
            fc.property(
                validNombre, validTelefono, validDireccion, validCorreo,
                (nombre, telefono, direccion, correo) => {
                    const resultado = validarDatosTutor({ nombre, telefono, direccion, correo });
                    expect(resultado.valido).toBe(true);
                    expect(resultado.errores).toHaveLength(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false cuando nombre está vacío', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('', '   ', '\t', '\n'),
                validTelefono, validDireccion, validCorreo,
                (nombre, telefono, direccion, correo) => {
                    const resultado = validarDatosTutor({ nombre, telefono, direccion, correo });
                    expect(resultado.valido).toBe(false);
                    expect(resultado.errores.some(e => e.campo === 'nombre')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false cuando teléfono es inválido', () => {
        fc.assert(
            fc.property(
                validNombre,
                fc.oneof(
                    fc.constant(''),
                    fc.constant('123456'),   // too short (6 digits)
                    fc.constant('1234567890123456'), // too long (16 digits)
                    fc.constant('abc1234567') // contains letters
                ),
                validDireccion, validCorreo,
                (nombre, telefono, direccion, correo) => {
                    const resultado = validarDatosTutor({ nombre, telefono, direccion, correo });
                    expect(resultado.valido).toBe(false);
                    expect(resultado.errores.some(e => e.campo === 'telefono')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false cuando dirección está vacía', () => {
        fc.assert(
            fc.property(
                validNombre, validTelefono,
                fc.constantFrom('', '   ', '\t'),
                validCorreo,
                (nombre, telefono, direccion, correo) => {
                    const resultado = validarDatosTutor({ nombre, telefono, direccion, correo });
                    expect(resultado.valido).toBe(false);
                    expect(resultado.errores.some(e => e.campo === 'direccion')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false cuando correo es inválido', () => {
        fc.assert(
            fc.property(
                validNombre, validTelefono, validDireccion,
                fc.constantFrom('', 'sinArroba', '@dominio.com', 'user@', 'user@.com', 'user@dom'),
                (nombre, telefono, direccion, correo) => {
                    const resultado = validarDatosTutor({ nombre, telefono, direccion, correo });
                    expect(resultado.valido).toBe(false);
                    expect(resultado.errores.some(e => e.campo === 'correo')).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
