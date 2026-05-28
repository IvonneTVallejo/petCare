// ================= REPORTE HISTORIAL MÉDICO =================

(function () {
    'use strict';

    // Inicializar al cargar la página
    document.addEventListener("DOMContentLoaded", function () {
        inicializarReporte();
        conectarBotones();
    });

    function inicializarReporte() {
        const contenedor = document.getElementById("contenido-reporte");
        const datosRaw = sessionStorage.getItem("datosHistorialMedico");

        if (!datosRaw) {
            contenedor.innerHTML = '<div class="mensaje-vacio"><p>No hay datos de historial disponibles</p></div>';
            return;
        }

        let datos;
        try {
            datos = JSON.parse(datosRaw);
        } catch (e) {
            contenedor.innerHTML = '<div class="mensaje-vacio"><p>Error al leer los datos del historial</p></div>';
            return;
        }

        if (!datos || !datos.eventos || datos.eventos.length === 0) {
            contenedor.innerHTML = '<div class="mensaje-vacio"><p>No se encontraron registros médicos en el período consultado</p></div>';
            return;
        }

        // Renderizar
        let html = '';
        html += renderizarEncabezado(datos.mascota, datos.tutor, datos.rangoFechas);
        html += '<div class="eventos-container">';
        datos.eventos.forEach(function (evento) {
            html += renderizarEvento(evento);
        });
        html += '</div>';

        contenedor.innerHTML = html;
    }

    function renderizarEncabezado(mascota, tutor, rangoFechas) {
        const fechaInicio = formatearFechaDisplay(rangoFechas.inicio);
        const fechaFin = formatearFechaDisplay(rangoFechas.fin);

        return `
        <div class="encabezado-reporte">
            <div class="encabezado-header">
                <img src="../Images/logo.png" alt="Logo" class="logo-reporte">
                <div class="encabezado-titulo">
                    <h1>Centro Veterinario Bonamur</h1>
                    <h2>Historial Médico del Paciente</h2>
                </div>
            </div>
            <div class="encabezado-datos">
                <div class="datos-paciente">
                    <h3>Datos del Paciente</h3>
                    <table>
                        <tr><td><strong>Nombre:</strong></td><td>${mascota.nombre || '—'}</td></tr>
                        <tr><td><strong>Especie:</strong></td><td>${mascota.especie || '—'}</td></tr>
                        <tr><td><strong>Raza:</strong></td><td>${mascota.raza || '—'}</td></tr>
                        <tr><td><strong>Sexo:</strong></td><td>${mascota.sexo || '—'}</td></tr>
                        <tr><td><strong>Peso:</strong></td><td>${mascota.peso ? mascota.peso + ' Kg' : '—'}</td></tr>
                        <tr><td><strong>Edad:</strong></td><td>${mascota.edad || '—'}</td></tr>
                    </table>
                </div>
                <div class="datos-tutor">
                    <h3>Datos del Tutor</h3>
                    <table>
                        <tr><td><strong>Nombre:</strong></td><td>${tutor.nombre || '—'}</td></tr>
                        <tr><td><strong>Teléfono:</strong></td><td>${tutor.telefono || '—'}</td></tr>
                        <tr><td><strong>Identificación:</strong></td><td>${tutor.identificacion || '—'}</td></tr>
                    </table>
                </div>
            </div>
            <div class="rango-fechas">
                <p><strong>Período del reporte:</strong> ${fechaInicio} — ${fechaFin}</p>
            </div>
        </div>`;
    }

    function renderizarEvento(evento) {
        const tipoLabel = obtenerLabelTipo(evento.tipo);
        const tipoClase = evento.tipo;
        const fechaDisplay = formatearFechaDisplay(evento.fecha);

        let contenido = '';

        switch (evento.tipo) {
            case 'consulta':
                contenido = renderizarConsulta(evento.datos);
                break;
            case 'vacunacion':
                contenido = renderizarVacunacion(evento.datos);
                break;
            case 'hospitalizacion':
                contenido = renderizarHospitalizacion(evento.datos);
                break;
            case 'seguimiento':
                contenido = renderizarSeguimiento(evento.datos);
                break;
            default:
                contenido = '<p>Evento no reconocido</p>';
        }

        return `
        <div class="evento-clinico evento-${tipoClase}">
            <div class="evento-header">
                <span class="evento-tipo">${tipoLabel}</span>
                <span class="evento-fecha">${fechaDisplay}</span>
            </div>
            <div class="evento-contenido">
                ${contenido}
            </div>
        </div>`;
    }

    function renderizarConsulta(datos) {
        let html = '';

        if (datos.motivo) {
            html += `<div class="campo-evento"><strong>Motivo de consulta:</strong> <span>${datos.motivo}</span></div>`;
        }
        if (datos.diagnosticoDiferencial) {
            html += `<div class="campo-evento"><strong>Diagnóstico diferencial:</strong> <span>${datos.diagnosticoDiferencial}</span></div>`;
        }
        if (datos.diagnosticoDefinitivo) {
            html += `<div class="campo-evento"><strong>Diagnóstico definitivo:</strong> <span>${datos.diagnosticoDefinitivo}</span></div>`;
        }

        // Examen físico
        if (datos.examenFisico) {
            html += '<div class="sub-seccion"><strong>Examen Físico:</strong>';
            html += '<div class="examen-fisico-grid">';
            const ef = datos.examenFisico;
            if (ef.peso) html += `<span><em>Peso:</em> ${ef.peso} Kg</span>`;
            if (ef.frecuenciaRespiratoria) html += `<span><em>F.R.:</em> ${ef.frecuenciaRespiratoria}</span>`;
            if (ef.frecuenciaCardiaca) html += `<span><em>F.C.:</em> ${ef.frecuenciaCardiaca}</span>`;
            if (ef.pulso) html += `<span><em>Pulso:</em> ${ef.pulso}</span>`;
            if (ef.tllc) html += `<span><em>TLLC:</em> ${ef.tllc}</span>`;
            if (ef.deshidratacion) html += `<span><em>Deshidratación:</em> ${ef.deshidratacion}</span>`;
            if (ef.trufa) html += `<span><em>Trufa:</em> ${ef.trufa}</span>`;
            if (ef.turgenciaPiel) html += `<span><em>Turgencia piel:</em> ${ef.turgenciaPiel}</span>`;
            if (ef.temperatura) html += `<span><em>Temperatura:</em> ${ef.temperatura}</span>`;
            if (ef.reflejoPupilar) html += `<span><em>Reflejo pupilar:</em> ${ef.reflejoPupilar}</span>`;
            if (ef.palpAbdominal) html += `<span><em>Palp. abdominal:</em> ${ef.palpAbdominal}</span>`;
            if (ef.estadoConciencia) html += `<span><em>Estado conciencia:</em> ${ef.estadoConciencia}</span>`;
            if (ef.aparienciaGeneral) html += `<span><em>Apariencia general:</em> ${ef.aparienciaGeneral}</span>`;
            if (ef.mucosas) html += `<span><em>Color mucosas:</em> ${ef.mucosas}</span>`;
            if (ef.bocaDientes) html += `<span><em>Boca y dientes:</em> ${ef.bocaDientes}</span>`;
            if (ef.ojos) html += `<span><em>Ojos:</em> ${ef.ojos}</span>`;
            if (ef.oidos) html += `<span><em>Oídos:</em> ${ef.oidos}</span>`;
            if (ef.pielPelo) html += `<span><em>Piel y pelo:</em> ${ef.pielPelo}</span>`;
            if (ef.sonidosCardiacos) html += `<span><em>Sonidos cardíacos:</em> ${ef.sonidosCardiacos}</span>`;
            if (ef.musculoEsqueletico) html += `<span><em>S. Músculo esquelético:</em> ${ef.musculoEsqueletico}</span>`;
            if (ef.otros) html += `<span><em>Otros:</em> ${ef.otros}</span>`;
            html += '</div></div>';
        }

        // Ectoparásitos
        if (datos.ectoparasitos) {
            const ecto = datos.ectoparasitos;
            const tieneInfo = ecto.pulgas || ecto.garrapatas || ecto.prurito || ecto.coproDirecto || ecto.coproFlotacion;
            if (tieneInfo) {
                html += '<div class="sub-seccion"><strong>Ectoparásitos:</strong> ';
                const items = [];
                if (ecto.pulgas) items.push('Pulgas: ' + ecto.pulgas + (ecto.descripcionPulgas ? ' (' + ecto.descripcionPulgas + ')' : ''));
                if (ecto.garrapatas) items.push('Garrapatas: ' + ecto.garrapatas + (ecto.descripcionGarrapatas ? ' (' + ecto.descripcionGarrapatas + ')' : ''));
                if (ecto.prurito) items.push('Prurito: ' + ecto.prurito + (ecto.descripcionPrurito ? ' (' + ecto.descripcionPrurito + ')' : ''));
                if (ecto.coproDirecto) items.push('Copro directo: ' + ecto.coproDirecto);
                if (ecto.coproFlotacion) items.push('Copro flotación: ' + ecto.coproFlotacion);
                html += items.join(' | ');
                html += '</div>';
            }
        }

        // Plan diagnóstico
        if (datos.planDiagnostico) {
            const plan = datos.planDiagnostico;
            const itemsSi = [];
            const itemsNo = [];
            const campos = [
                { key: 'raspado', label: 'Raspado' },
                { key: 'citologia', label: 'Citología' },
                { key: 'rxContraste', label: 'Rx Contraste' },
                { key: 'perfilRenal', label: 'Perfil Renal' },
                { key: 'quimicaSanguinea', label: 'Química Sanguínea' },
                { key: 'perfilPreanestesico', label: 'Perfil Preanestésico' },
                { key: 'perfilHepatico', label: 'Perfil Hepático' },
                { key: 'snap', label: 'SNAP' },
                { key: 'radiografia', label: 'Radiografía' },
                { key: 'endoscopia', label: 'Endoscopia' },
                { key: 'hospitalizacion', label: 'Hospitalización' },
                { key: 'sedacion', label: 'Sedación' },
                { key: 'anestesia', label: 'Anestesia' },
                { key: 'suturas', label: 'Suturas' },
                { key: 'observacion', label: 'Observación' },
                { key: 'interconsulta', label: 'Interconsulta' }
            ];
            campos.forEach(function(c) {
                if (plan[c.key] === 'S') itemsSi.push(c.label);
                else if (plan[c.key] === 'N') itemsNo.push(c.label);
            });
            if (itemsSi.length > 0 || itemsNo.length > 0) {
                html += '<div class="sub-seccion"><strong>Plan diagnóstico:</strong>';
                if (itemsSi.length > 0) html += '<br>✅ Sí: ' + itemsSi.join(', ');
                if (itemsNo.length > 0) html += '<br>❌ No: ' + itemsNo.join(', ');
                html += '</div>';
            }
        }

        // Fórmula / Medicamentos
        if (datos.formula) {
            html += `<div class="campo-evento"><strong>Fórmula:</strong> <span>${datos.formula}</span></div>`;
        }
        if (datos.medicamentosAplicados && datos.medicamentosAplicados !== '[]') {
            try {
                const meds = JSON.parse(datos.medicamentosAplicados);
                if (Array.isArray(meds) && meds.length > 0) {
                    html += '<div class="sub-seccion"><strong>Medicamentos aplicados:</strong><ul>';
                    meds.forEach(function (m) {
                        const unidad = m.unidad ? ' ' + m.unidad : '';
                        html += `<li>${m.nombre || ''} ${m.lote ? '(Lote: ' + m.lote + ')' : ''} - Cant: ${m.cantidad || ''}${unidad}</li>`;
                    });
                    html += '</ul></div>';
                }
            } catch (e) {
                html += `<div class="campo-evento"><strong>Medicamentos:</strong> <span>${datos.medicamentosAplicados}</span></div>`;
            }
        }

        if (datos.observaciones) {
            html += `<div class="campo-evento"><strong>Observaciones:</strong> <span>${datos.observaciones}</span></div>`;
        }

        return html;
    }

    function renderizarVacunacion(datos) {
        let html = '';
        if (datos.nombreVacuna) {
            html += `<div class="campo-evento"><strong>Vacuna:</strong> <span>${datos.nombreVacuna}</span></div>`;
        }
        if (datos.cantidad) {
            const unidad = datos.unidad ? ' ' + datos.unidad : '';
            html += `<div class="campo-evento"><strong>Cantidad aplicada:</strong> <span>${datos.cantidad}${unidad}</span></div>`;
        }
        if (datos.fecha) {
            html += `<div class="campo-evento"><strong>Fecha de aplicación:</strong> <span>${formatearFechaDisplay(datos.fecha)}</span></div>`;
        }
        if (datos.observaciones) {
            html += `<div class="campo-evento"><strong>Observaciones:</strong> <span>${datos.observaciones}</span></div>`;
        }
        return html;
    }

    function renderizarHospitalizacion(datos) {
        let html = '';

        // Datos generales
        if (datos.fechaIngreso) {
            html += '<div class="campo-evento"><strong>Fecha de ingreso:</strong> <span>' + formatearFechaDisplay(datos.fechaIngreso) + '</span></div>';
        }
        if (datos.fechaEgreso) {
            html += '<div class="campo-evento"><strong>Fecha de egreso:</strong> <span>' + formatearFechaDisplay(datos.fechaEgreso) + '</span></div>';
        }
        if (datos.peso) {
            html += '<div class="campo-evento"><strong>Peso:</strong> <span>' + datos.peso + ' kg</span></div>';
        }
        if (datos.estado) {
            html += '<div class="campo-evento"><strong>Estado:</strong> <span>' + datos.estado + '</span></div>';
        }
        if (datos.medicoTratante) {
            html += '<div class="campo-evento"><strong>Médico tratante:</strong> <span>' + datos.medicoTratante + '</span></div>';
        }
        if (datos.auxiliarTratante) {
            html += '<div class="campo-evento"><strong>Auxiliar tratante:</strong> <span>' + datos.auxiliarTratante + '</span></div>';
        }

        // Hidratación
        if (datos.hidratacion) {
            html += '<div class="campo-evento"><strong>Hidratación:</strong> <span>' + datos.hidratacion + '</span></div>';
        }

        // Medicamentos del tratamiento
        if (datos.medicamentos && datos.medicamentos.length > 0) {
            html += '<div class="sub-seccion"><strong>Medicamentos del tratamiento:</strong>';
            html += '<table class="tabla-monitoreo"><thead><tr><th>Nombre</th><th>Dosis</th><th>Vía</th><th>ML</th></tr></thead><tbody>';
            datos.medicamentos.forEach(function (m) {
                html += '<tr><td>' + (m.nombre || '—') + '</td><td>' + (m.dosis || '—') + '</td><td>' + (m.via || '—') + '</td><td>' + (m.ml || '—') + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        // Medicamentos adicionales
        if (datos.medicamentosAdicionalesJson && datos.medicamentosAdicionalesJson.length > 0) {
            html += '<div class="sub-seccion"><strong>Medicamentos adicionales:</strong><ul>';
            datos.medicamentosAdicionalesJson.forEach(function (m) {
                html += '<li>' + (m.nombre || 'Producto') + ' — Cantidad: ' + (m.cantidad || 1) + '</li>';
            });
            html += '</ul></div>';
        } else if (datos.medicamentosAdicionalesTexto) {
            html += '<div class="campo-evento"><strong>Medicamentos adicionales:</strong> <span>' + datos.medicamentosAdicionalesTexto + '</span></div>';
        }

        // Administraciones
        if (datos.administraciones && datos.administraciones.length > 0 && datos.medicamentos && datos.medicamentos.length > 0) {
            html += renderizarTablaAdministraciones(datos.medicamentos, datos.administraciones);
        }

        // Monitoreos
        if (datos.monitoreos && datos.monitoreos.length > 0) {
            html += renderizarTablaMonitoreo(datos.monitoreos);
        }

        // Observaciones generales
        if (datos.observaciones) {
            html += '<div class="campo-evento"><strong>Observaciones generales:</strong> <span>' + datos.observaciones + '</span></div>';
        }

        // Observaciones de evolución
        if (datos.observacionesEvolucion && datos.observacionesEvolucion.length > 0) {
            html += '<div class="sub-seccion"><strong>Notas de evolución:</strong><ul>';
            var evolucionesOrdenadas = datos.observacionesEvolucion.slice().sort(function(a, b) {
                return new Date(a.fecha) - new Date(b.fecha);
            });
            evolucionesOrdenadas.forEach(function (o) {
                var fechaObs = o.fecha ? formatearFechaDisplay(o.fecha) : '';
                html += '<li>' + (fechaObs ? '[' + fechaObs + '] ' : '') + (o.tipo ? '(' + o.tipo + ') ' : '') + o.texto + '</li>';
            });
            html += '</ul></div>';
        }

        return html;
    }

    function renderizarTablaAdministraciones(medicamentos, administraciones) {
        var diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        var html = '<div class="sub-seccion"><strong>Control de administraciones:</strong>';
        html += '<table class="tabla-monitoreo"><thead><tr><th>Medicamento</th>';
        diasSemana.forEach(function(dia) { html += '<th>' + dia + '</th>'; });
        html += '</tr></thead><tbody>';

        medicamentos.forEach(function(med) {
            html += '<tr><td>' + (med.nombre || '—') + '</td>';
            diasSemana.forEach(function(dia) {
                var admsDia = administraciones.filter(function(a) {
                    return a.medicamentoId === med.id && a.diaSemana === dia;
                });
                if (admsDia.length > 0) {
                    var horas = admsDia.map(function(a) {
                        var hora = a.hora ? a.hora.substring(0, 5) : '';
                        return a.aplicado ? '<span style="color:green;">' + hora + ' ✓</span>' : '<span style="color:orange;">' + hora + '</span>';
                    }).join(', ');
                    html += '<td>' + horas + '</td>';
                } else {
                    html += '<td>—</td>';
                }
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    function renderizarTablaMonitoreo(monitoreos) {
        var parametros = [
            { key: 'colorMucosas', label: 'Color mucosas' },
            { key: 'tllc', label: 'TLLC' },
            { key: 'sed', label: 'Sed' },
            { key: 'apetito', label: 'Apetito' },
            { key: 'animo', label: 'Ánimo' },
            { key: 'temperatura', label: 'Temperatura' },
            { key: 'fc', label: 'F.C.' },
            { key: 'fr', label: 'F.R.' },
            { key: 'vomitos', label: 'Vómitos' },
            { key: 'diarreas', label: 'Diarreas' },
            { key: 'comio', label: 'Comió' },
            { key: 'tomoAgua', label: 'Tomó agua' },
            { key: 'defeco', label: 'Defecó' }
        ];

        // Get unique days and sort them
        var diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        var diasPresentes = [];
        diasSemana.forEach(function(dia) {
            if (monitoreos.some(function(m) { return m.diaSemana === dia; })) {
                diasPresentes.push(dia);
            }
        });

        if (diasPresentes.length === 0) return '';

        var html = '<div class="sub-seccion"><strong>Monitoreo clínico:</strong>';
        html += '<table class="tabla-monitoreo"><thead><tr><th>Parámetro</th>';
        diasPresentes.forEach(function(dia) {
            html += '<th colspan="2">' + dia + '</th>';
        });
        html += '</tr><tr><th></th>';
        diasPresentes.forEach(function() {
            html += '<th>AM</th><th>PM</th>';
        });
        html += '</tr></thead><tbody>';

        parametros.forEach(function(param) {
            html += '<tr><td><strong>' + param.label + '</strong></td>';
            diasPresentes.forEach(function(dia) {
                ['AM', 'PM'].forEach(function(turno) {
                    var registro = monitoreos.find(function(m) {
                        return m.diaSemana === dia && m.turno === turno;
                    });
                    var valor = '';
                    if (registro) {
                        var v = registro[param.key];
                        if (typeof v === 'boolean') {
                            valor = v ? 'Sí' : 'No';
                        } else if (v !== '' && v !== null && v !== undefined) {
                            valor = String(v);
                        } else {
                            valor = '—';
                        }
                    } else {
                        valor = '—';
                    }
                    html += '<td>' + valor + '</td>';
                });
            });
            html += '</tr>';
        });

        html += '</tbody></table></div>';
        return html;
    }

    function renderizarSeguimiento(datos) {
        let html = '';
        if (datos.fecha) {
            html += `<div class="campo-evento"><strong>Fecha:</strong> <span>${formatearFechaDisplay(datos.fecha)}</span></div>`;
        }
        if (datos.texto) {
            html += `<div class="campo-evento"><strong>Evolución:</strong> <span>${datos.texto}</span></div>`;
        }
        if (datos.formula) {
            html += `<div class="campo-evento"><strong>Fórmula:</strong> <span>${datos.formula}</span></div>`;
        }
        return html;
    }

    // ===== Utilidades =====

    function obtenerLabelTipo(tipo) {
        const labels = {
            'consulta': '🩺 Consulta Médica',
            'vacunacion': '💉 Vacunación',
            'hospitalizacion': '🏥 Hospitalización',
            'seguimiento': '📋 Seguimiento'
        };
        return labels[tipo] || tipo;
    }

    function formatearFechaDisplay(fecha) {
        if (!fecha) return '—';
        const partes = fecha.trim().split(' ')[0].split('-');
        if (partes.length < 3) return fecha;
        return partes[2] + '/' + partes[1] + '/' + partes[0];
    }

    function generarNombreArchivoPDFLocal(nombreMascota) {
        const hoy = new Date();
        const fechaStr = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
        const nombre = (nombreMascota && typeof nombreMascota === 'string')
            ? nombreMascota.trim().replace(/\s+/g, '_')
            : 'Mascota';
        return 'Historial_' + nombre + '_' + fechaStr + '.pdf';
    }

    // ===== Exportación PDF =====

    function exportarPDF(nombreArchivo) {
        const elemento = document.getElementById("contenido-reporte");
        const opciones = {
            margin: [10, 10, 10, 10],
            filename: nombreArchivo,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
        };
        html2pdf().set(opciones).from(elemento).save();
    }

    // ===== Conectar botones =====

    function conectarBotones() {
        document.getElementById("btnImprimir").addEventListener("click", function () {
            window.print();
        });

        document.getElementById("btnExportarPDF").addEventListener("click", function () {
            const datosRaw = sessionStorage.getItem("datosHistorialMedico");
            let nombreMascota = 'Mascota';
            if (datosRaw) {
                try {
                    const datos = JSON.parse(datosRaw);
                    nombreMascota = datos.mascota.nombre || 'Mascota';
                } catch (e) { }
            }
            const nombreArchivo = generarNombreArchivoPDFLocal(nombreMascota);
            exportarPDF(nombreArchivo);
        });
    }

})();
