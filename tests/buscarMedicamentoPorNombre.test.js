import { describe, it, expect } from 'vitest';
import { buscarMedicamentoPorNombre } from '../js/utils-inventario.js';

describe('buscarMedicamentoPorNombre', () => {
    const medicamentos = [
        { pr_id_producto: 1, pr_nombre: 'Diarreol', pr_lote: 'L001', pr_cantidad_disponible: 10 },
        { pr_id_producto: 2, pr_nombre: 'Ketoprofeno', pr_lote: 'L002', pr_cantidad_disponible: 5 },
        { pr_id_producto: 3, pr_nombre: 'Amoxicilina', pr_lote: 'L003', pr_cantidad_disponible: 0 },
        { pr_id_producto: 4, pr_nombre: 'Diazepam', pr_lote: 'L004', pr_cantidad_disponible: 3 },
    ];

    it('retorna array vacío si el término tiene menos de 2 caracteres', () => {
        expect(buscarMedicamentoPorNombre(medicamentos, '')).toEqual([]);
        expect(buscarMedicamentoPorNombre(medicamentos, 'a')).toEqual([]);
        expect(buscarMedicamentoPorNombre(medicamentos, ' ')).toEqual([]);
    });

    it('filtra medicamentos cuyo nombre contiene el término (case-insensitive)', () => {
        const resultado = buscarMedicamentoPorNombre(medicamentos, 'dia');
        expect(resultado).toHaveLength(2);
        expect(resultado[0].pr_nombre).toBe('Diarreol');
        expect(resultado[1].pr_nombre).toBe('Diazepam');
    });

    it('búsqueda es case-insensitive', () => {
        const resultado = buscarMedicamentoPorNombre(medicamentos, 'KETO');
        expect(resultado).toHaveLength(1);
        expect(resultado[0].pr_nombre).toBe('Ketoprofeno');
    });

    it('retorna array vacío si no hay coincidencias', () => {
        expect(buscarMedicamentoPorNombre(medicamentos, 'xyz')).toEqual([]);
    });

    it('retorna array vacío si medicamentos no es un array', () => {
        expect(buscarMedicamentoPorNombre(null, 'dia')).toEqual([]);
        expect(buscarMedicamentoPorNombre(undefined, 'dia')).toEqual([]);
        expect(buscarMedicamentoPorNombre('string', 'dia')).toEqual([]);
    });

    it('retorna array vacío si termino es null o undefined', () => {
        expect(buscarMedicamentoPorNombre(medicamentos, null)).toEqual([]);
        expect(buscarMedicamentoPorNombre(medicamentos, undefined)).toEqual([]);
    });

    it('ignora items inválidos en la lista de medicamentos', () => {
        const conInvalidos = [
            null,
            { pr_id_producto: 1, pr_nombre: 'Diarreol' },
            { pr_id_producto: 2 },
            { pr_id_producto: 3, pr_nombre: null },
        ];
        const resultado = buscarMedicamentoPorNombre(conInvalidos, 'dia');
        expect(resultado).toHaveLength(1);
        expect(resultado[0].pr_nombre).toBe('Diarreol');
    });

    it('maneja término con espacios al inicio/final', () => {
        const resultado = buscarMedicamentoPorNombre(medicamentos, '  dia  ');
        expect(resultado).toHaveLength(2);
    });

    it('retorna array vacío si término trimmed tiene menos de 2 caracteres', () => {
        expect(buscarMedicamentoPorNombre(medicamentos, '  a  ')).toEqual([]);
    });
});
