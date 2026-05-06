import { describe, it, expect } from 'vitest';
import { construirMovimientoConsulta } from '../js/utils-inventario.js';

describe('construirMovimientoConsulta', () => {
    it('should return an object with all required fields', () => {
        const result = construirMovimientoConsulta(10, 3, 5000, 7, 42);

        expect(result).toEqual({
            mi_pr_id_producto: 10,
            mi_tmi_id_tipo: 4,
            mi_cantidad: 3,
            mi_costo_unitario: 5000,
            mi_saldo_resultante: 7,
            mi_notas: "Consulta médica #42"
        });
    });

    it('should always set mi_tmi_id_tipo to 4', () => {
        const result = construirMovimientoConsulta(1, 1, 100, 0, 1);
        expect(result.mi_tmi_id_tipo).toBe(4);
    });

    it('should include idConsulta in mi_notas with correct format', () => {
        const result = construirMovimientoConsulta(5, 2, 3000, 8, 123);
        expect(result.mi_notas).toBe("Consulta médica #123");
    });

    it('should pass through productoId directly to mi_pr_id_producto', () => {
        const result = construirMovimientoConsulta(99, 1, 200, 5, 10);
        expect(result.mi_pr_id_producto).toBe(99);
    });

    it('should pass through cantidad directly to mi_cantidad', () => {
        const result = construirMovimientoConsulta(1, 15, 100, 5, 10);
        expect(result.mi_cantidad).toBe(15);
    });

    it('should pass through costoUnitario directly to mi_costo_unitario', () => {
        const result = construirMovimientoConsulta(1, 1, 7500, 5, 10);
        expect(result.mi_costo_unitario).toBe(7500);
    });

    it('should pass through saldoResultante directly to mi_saldo_resultante', () => {
        const result = construirMovimientoConsulta(1, 1, 100, 0, 10);
        expect(result.mi_saldo_resultante).toBe(0);
    });

    it('should handle saldoResultante of 0 correctly', () => {
        const result = construirMovimientoConsulta(5, 10, 2000, 0, 55);
        expect(result.mi_saldo_resultante).toBe(0);
        expect(result.mi_notas).toBe("Consulta médica #55");
    });

    it('should handle large idConsulta values', () => {
        const result = construirMovimientoConsulta(1, 1, 100, 5, 99999);
        expect(result.mi_notas).toBe("Consulta médica #99999");
    });
});
