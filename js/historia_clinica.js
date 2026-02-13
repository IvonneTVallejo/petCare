var idBuscado = 0;

$(document).ready(function () {
   // consultarEmpleador();
});




const botonActualizar = document.getElementById('btnNuevoRegistro');
botonActualizar.addEventListener('click', function () {
    limpiarCampos();
});

// Funciones para limpiar los campos de los modales insertar y actualizar
function limpiarCampos() {
    $("#tipo").val("");
    $("#nit").val("");
    $("#nombre").val("");
    $("#telefono").val("");
    $("#correo").val("");
}

// Funcion para listar todos los empleadores
function consultarEmpleador() {
    $.ajax({
        url: "http://localhost:8085/libertadores/empleador/general",
        type: "GET",
        dataType: "json",
        success: function (response) {

            response.sort(function(a, b) {
                return b.idEmpleador - a.idEmpleador;
            });

            $("#contenidoTablaEmpleador").empty();
            response.forEach(element => {
                var row = $("<tr>");
                row.append($("<td>").text(element.tipoDocumentoEmpleador));
                row.append($("<td>").text(element.identificadorEmpleador));
                row.append($("<td>").text(element.nombreEmpleador));
                row.append($("<td>").text(element.telefonoEmpleador));
                row.append($("<td>").text(element.correoEmpleador));

                row.append($("<td class='text-center no-padding'>").append('<button type="button" class="btn btn-warning btn-block w-100" style="font-size: 12px;" data-target="#actualizarEmpleadorModal" data-toggle="modal" onclick="buscarEmpleador(' + element.idEmpleador + ')">Editar</button>'));
                $("#contenidoTablaEmpleador").append(row);
            });
        },
        error: function (xhr, status, error) {
            Swal.fire({
                text: '¡Ha ocurrido un error!',
                icon: 'error',
                confirmButtonColor: '#0f5044',
                customClass: {
                    popup: 'my-swal-popup',
                }
            });
        }
    });
}

// Funcion para registrar un empleador
function crearEmpleador() {

    if(!validarCorreo()){
        return false;
    }

    if ($("#nit").val().length == 0 || $("#nombre").val().length == 0 || $("#telefono").val().length == 0 || $("#correo").val().length == 0 || $("#tipo").val() == "") {
        Swal.fire({
            text: '¡Por favor complete todos los campos!',
            icon: 'warning',
            confirmButtonColor: '#0f5044',
            customClass: {
                popup: 'my-swal-popup',
            }
        });
    } else {
        const url = 'http://localhost:8085/libertadores/empleador';
        const datos = {
            tipoDocumentoEmpleador: $("#tipo").val(),
            identificadorEmpleador: $("#nit").val(),
            nombreEmpleador: $("#nombre").val(),
            telefonoEmpleador: $("#telefono").val(),
            correoEmpleador: $("#correo").val(),
        };
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la solicitud');
                }
                return response.json();
            })
            .then(data => {
                Swal.fire({
                    text: '¡Empleador creado exitosamente!',
                    icon: 'success',
                    confirmButtonColor: '#0f5044',
                    customClass: {
                        popup: 'my-swal-popup',
                    }
                })
                    .then(() => {
                        consultarEmpleador();
                        limpiarCampos();
                        window.location.reload()
                    });
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    text: '¡Empleador ya existe en la base de datos!',
                    icon: 'error',
                    confirmButtonColor: '#0f5044',
                    customClass: {
                        popup: 'my-swal-popup',
                    }
                });
            });
    }
}

// Funcion para actualizar un empleador
function actualizarEmpleador() {
    if ($("#tipoUP").val().length == 0 || $("#nitUP").val().length == 0 || $("#nombreUP").val().length == 0 || $("#telefonoUP").val().length == 0 || $("#correoUP").val().length == 0) {
        Swal.fire({
            text: '¡Por favor complete todos los campos!',
            icon: 'warning',
            confirmButtonColor: '#0f5044',
            customClass: {
                popup: 'my-swal-popup',
            }
        });
    } else {
        const url = 'http://localhost:8085/libertadores/empleador/';
        var id = idBuscado;
        var tipo = $("#tipoUP").val();
        var nit = $("#nitUP").val();
        var nombre = $("#nombreUP").val();
        var telefono = $("#telefonoUP").val();
        var correo = $("#correoUP").val();
        var datos = {
            idEmpleador: id,
            tipoDocumentoEmpleador: tipo,
            identificadorEmpleador: nit,
            nombreEmpleador: nombre,
            telefonoEmpleador: telefono,
            correoEmpleador: correo,
        };
        fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error en la solicitud');
                }
                return response.json();
            })
            .then(data => {
                Swal.fire({
                    text: '¡Empleador actualizado exitosamente!',
                    icon: 'success',
                    confirmButtonColor: '#0f5044',
                    customClass: {
                        popup: 'my-swal-popup',
                    },
                })
                    .then(() => {
                        consultarEmpleador();
                        window.location.reload();
                    });
            })
            .catch(error => {
                console.error('Error:', error);
                Swal.fire({
                    text: '¡Ha ocurrido un error!',
                    icon: 'error',
                    confirmButtonColor: '#0f5044',
                    customClass: {
                        popup: 'my-swal-popup',
                    }
                });
            });
    }
}

// Funcion para buscar un empleador y poder modificarlo 
function buscarEmpleador(id) {
    $.ajax({
        url: "http://localhost:8085/libertadores/empleador/" + id,
        type: "GET",
        dataType: "json",
        success: function (response) {
            if (response.idEmpleador != null) {
                idBuscado = response.idEmpleador;
                $("#tipoUP").val(response.tipoDocumentoEmpleador);
                $("#nitUP").val(response.identificadorEmpleador);
                $("#nombreUP").val(response.nombreEmpleador);
                $("#telefonoUP").val(response.telefonoEmpleador);
                $("#correoUP").val(response.correoEmpleador);
            } else {
                Swal.fire({
                    text: '¡No se encontró el registro!',
                    icon: 'error',
                    confirmButtonColor: '#0f5044',
                    customClass: {
                        popup: 'my-swal-popup',
                    }
                });
            }
        },
        error: function (xhr, status) {
            Swal.fire({
                text: '¡Ha ocurrido un error!',
                icon: 'error',
                confirmButtonColor: '#0f5044',
                customClass: {
                    popup: 'my-swal-popup',
                }
            });
        }
    });
}

// Funcion para filtrar tabla por medio del input 
$(document).ready(function () {
    $("#filtroInput").on("keyup", function () {
        var value = $(this).val().toLowerCase();
        $("#contenidoTablaEmpleador tr").filter(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(value) > -1)
        });
    });
});

function validarCorreo() {
    var correoInput = document.getElementById("correo");
    var correo = correoInput.value;

    var regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regex.test(correo)) {
        correoInput.classList.add("error");
        return false;
    } else {
        correoInput.classList.remove("error"); 
        return true;
    }
}