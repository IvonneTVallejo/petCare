$(document).ready(function () {
cargarIdUsuarioEnInput();
});


function limpiarCampos() {
    $("#password1").val("");
    $("#password1").val("");
}

function cargarIdUsuarioEnInput() {
    if (localStorage.getItem('idUser')) {
        var idUsuario = localStorage.getItem('idUser');
        document.getElementById('idUser').value = idUsuario;
    } else {
        console.log('No se encontró el idUsuario en el localStorage.');
    }
}


function modificarContraseña() {
    var idUsuario = document.getElementById('idUser').value;
    var password1 = document.getElementById('password1').value;
    var password2 = document.getElementById('password2').value;
    
    if (password1 !== password2) {
        Swal.fire({
            text: '¡Las contraseñas no coinciden!',
            icon: 'warning',
            confirmButtonColor: '#0f5044',
            customClass: {
                popup: 'my-swal-popup',
            }
        });
        return;
    }
    
    var data = {
        idUsuario: idUsuario,
        password: password1
    };

    fetch('http://localhost:8085/libertadores/usuario/password', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(result => {
        Swal.fire({
            text: '¡Cambio de contraseña exitoso!',
            icon: 'success',
            confirmButtonColor: '#0f5044',
            customClass: {
                popup: 'my-swal-popup',
            }
        })
            .then(() => {
            
                limpiarCampos();
                window.location.reload()
            });
    })
    .catch(error => {
        console.error('Error al modificar la contraseña:', error);
    });
}
