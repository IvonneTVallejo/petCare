import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { validarArchivoAdjunto } from '../js/utils-mascotas.js';

/**
 * **Validates: Requirements 4.3, 4.4**
 * Propiedad 4: Validación de tamaño de archivo adjunto
 */
describe('validarArchivoAdjunto - Property-Based Tests', () => {

    const MAX_SIZE = 5 * 1024 * 1024; // 5,242,880 bytes

    it('retorna valido=true para archivos con tamaño <= 5 MB', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 0, max: MAX_SIZE }),
                fc.string({ minLength: 1, maxLength: 50 }),
                (size, name) => {
                    const file = { size, name };
                    const resultado = validarArchivoAdjunto(file);
                    expect(resultado.valido).toBe(true);
                    expect(resultado.error).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('retorna valido=false para archivos con tamaño > 5 MB', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: MAX_SIZE + 1, max: MAX_SIZE * 10 }),
                fc.string({ minLength: 1, maxLength: 50 }),
                (size, name) => {
                    const file = { size, name };
                    const resultado = validarArchivoAdjunto(file);
                    expect(resultado.valido).toBe(false);
                    expect(resultado.error).toContain(name);
                    expect(resultado.error).toContain('5 MB');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('el límite exacto de 5 MB es aceptado', () => {
        const file = { size: MAX_SIZE, name: 'test.pdf' };
        const resultado = validarArchivoAdjunto(file);
        expect(resultado.valido).toBe(true);
    });

    it('un byte sobre el límite es rechazado', () => {
        const file = { size: MAX_SIZE + 1, name: 'test.pdf' };
        const resultado = validarArchivoAdjunto(file);
        expect(resultado.valido).toBe(false);
    });
});
