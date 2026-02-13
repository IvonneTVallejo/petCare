document.addEventListener("DOMContentLoaded", async () => {

    const datos = JSON.parse(sessionStorage.getItem("datosFormula"));
    if (!datos) return;

    // 🔹 Llenar plantilla
    document.getElementById("pdf_propietario").textContent = datos.propietario;
    document.getElementById("pdf_mascota").textContent = datos.mascota;
    document.getElementById("pdf_especie").textContent = datos.especie;
    document.getElementById("pdf_raza").textContent = datos.raza;
    document.getElementById("pdf_sexo").textContent = datos.sexo;
    document.getElementById("pdf_peso").textContent = datos.peso + " kg";
    document.getElementById("pdf_tratamiento").textContent = datos.tratamiento;

    // 🔹 Generar nombre dinámico
    const fecha = new Date().toISOString().split("T")[0];
    const nombreArchivo = `Formula_${datos.mascota}_${fecha}.pdf`;

    const elemento = document.querySelector(".formula");

    const opciones = {
        margin: 0,
        filename: nombreArchivo,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 3 },
        jsPDF: { unit: "cm", format: [13, 20], orientation: "portrait" }
    };

    await html2pdf().set(opciones).from(elemento).save();

    // 🔹 Cerrar ventana automáticamente
    sessionStorage.removeItem("datosFormula");
    window.close();
});