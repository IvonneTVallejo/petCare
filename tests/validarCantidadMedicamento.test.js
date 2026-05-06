import { describe, it, expect } from 'vitest';
import { validarCantidadMedicamento } from '../js/utils-inventario.js';

describe('validarCantidadMedicamento', () => {
    describe('cantidad válida dentro del rango [1, stockDisponible]', () => {
        it('acepta cantidad = 1 con stock disponible', () => {
            const resultado = validarCantidadMedicamento(1, 10);
            expect(resultado).toEqual({ valido: true, cantidadFinal: 1, error: null });
        });

        it('acepta cantidad igual al stock disponible', () => {
            const resultado = validarCantidadMedicamento(10, 10);
            expect(resultado).toEqual({ valido: true, cantidadFinal: 10, error: null });
        });

        it('acepta cantidad intermedia dentro del rango', () => {
            const resultado = validarCantidadMedicamento(5, 10);
            expect(resultado).toEqual({ valido: true, cantidadFinal: 5, error: null });
        });

        it('acepta cantidad = 1 con stock = 1 (caso límite mínimo)', () => {
            const resultado = validarCantidadMedicamento(1, 1);
            expect(resultado).toEqual({ valido: true, cantidadFinal: 1, error: null });
        });
    });

    describe('cantidad menor a 1', () => {
        it('rechaza cantidad = 0 y retorna cantidadFinal = 1', () => {
            const resultado = validarCantidadMedicamento(0, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(1);
            expect(resultado.error).toBe("La cantidad debe ser mayor a 0");
        });

        it('rechaza cantidad negativa y retorna cantidadFinal = 1', () => {
            const resultado = validarCantidadMedicamento(-5, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(1);
            expect(resultado.error).toBe("La cantidad debe ser mayor a 0");
        });
    });

    describe('cantidad mayor al stock disponible', () => {
        it('rechaza cantidad > stock y retorna cantidadFinal = stockDisponible', () => {
            const resultado = validarCantidadMedicamento(15, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(10);
            expect(resultado.error).toBe("Stock máximo disponible: 10");
        });

        it('rechaza cantidad = stock + 1 (caso límite superior)', () => {
            const resultado = validarCantidadMedicamento(11, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(10);
            expect(resultado.error).toBe("Stock máximo disponible: 10");
        });

        it('incluye el stock disponible en el mensaje de error', () => {
            const resultado = validarCantidadMedicamento(100, 25);
            expect(resultado.error).toBe("Stock máximo disponible: 25");
        });
    });

    describe('edge cases: inputs no numéricos', () => {
        it('rechaza cantidad como string', () => {
            const resultado = validarCantidadMedicamento('5', 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(1);
            expect(resultado.error).toBe("La cantidad debe ser un número válido");
        });

        it('rechaza cantidad null', () => {
            const resultado = validarCantidadMedicamento(null, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).not.toBeNull();
        });

        it('rechaza cantidad undefined', () => {
            const resultado = validarCantidadMedicamento(undefined, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).not.toBeNull();
        });

        it('rechaza cantidad NaN', () => {
            const resultado = validarCantidadMedicamento(NaN, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(1);
            expect(resultado.error).toBe("La cantidad debe ser un número válido");
        });

        it('rechaza cantidad Infinity', () => {
            const resultado = validarCantidadMedicamento(Infinity, 10);
            expect(resultado.valido).toBe(false);
            expect(resultado.error).not.toBeNull();
        });
    });

    describe('edge cases: stockDisponible inválido', () => {
        it('rechaza stockDisponible = 0', () => {
            const resultado = validarCantidadMedicamento(1, 0);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(0);
            expect(resultado.error).toBe("Stock no disponible");
        });

        it('rechaza stockDisponible negativo', () => {
            const resultado = validarCantidadMedicamento(1, -5);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(0);
            expect(resultado.error).toBe("Stock no disponible");
        });

        it('rechaza stockDisponible no numérico', () => {
            const resultado = validarCantidadMedicamento(1, '10');
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(0);
            expect(resultado.error).toBe("Stock no disponible");
        });

        it('rechaza stockDisponible null', () => {
            const resultado = validarCantidadMedicamento(1, null);
            expect(resultado.valido).toBe(false);
            expect(resultado.cantidadFinal).toBe(0);
            expect(resultado.error).toBe("Stock no disponible");
        });
    });
});
