document.addEventListener("DOMContentLoaded", async () => {

    const datos = JSON.parse(sessionStorage.getItem("datosFormula"));
    if (!datos) {
        document.body.innerHTML = '<p style="text-align:center;margin-top:50px;">No hay datos de fórmula disponibles.</p>';
        return;
    }

    // 🔹 Llenar plantilla
    document.getElementById("pdf_propietario").textContent = datos.propietario;
    document.getElementById("pdf_mascota").textContent = datos.mascota;
    document.getElementById("pdf_especie").textContent = datos.especie;
    document.getElementById("pdf_raza").textContent = datos.raza;
    document.getElementById("pdf_sexo").textContent = datos.sexo;
    document.getElementById("pdf_peso").textContent = datos.peso;
    document.getElementById("pdf_tratamiento").textContent = datos.tratamiento;

    // 🔹 Limpiar sessionStorage
    sessionStorage.removeItem("datosFormula");

    // 🔹 Imprimir y cerrar ventana al terminar
    setTimeout(() => {
        window.print();
        // Cerrar ventana después de imprimir o cancelar
        window.onafterprint = () => window.close();
        // Fallback: cerrar después de un tiempo si onafterprint no se dispara
        setTimeout(() => window.close(), 1000);
    }, 500);
});