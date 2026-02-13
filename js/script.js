const body = document.querySelector("body"),
    modeToggle = body.querySelector(".mode-toggle");
sidebar = body.querySelector("nav");
sidebarToggle = body.querySelector(".sidebar-toggle");

let getMode = localStorage.getItem("mode");
if (getMode && getMode === "dark") {
    body.classList.toggle("dark");
}

let getStatus = localStorage.getItem("status");
if (getStatus && getStatus === "close") {
    sidebar.classList.toggle("close");
}

sidebarToggle.addEventListener("click", () => {
    sidebar.classList.toggle("close");
    if (sidebar.classList.contains("close")) {
        localStorage.setItem("status", "close");
    } else {
        localStorage.setItem("status", "open");
    }
})

var tipoUsuario = localStorage.getItem("tipoUsuario");

var username = localStorage.getItem("nombreVet");

var usernameDisplay = document.getElementById("usernameDisplay");
usernameDisplay.innerHTML = `<img src="/Images/sesion.png" /> Usuario: ${username}`;



//var paginasRestringidas = ["usuarios.html", "salario.html"]; 

var url = window.location.href;
var fileName = url.substring(url.lastIndexOf('/') + 1);

//if (paginasRestringidas.includes(fileName) && tipoUsuario === "asesor") {
//   window.location.href = '/pages/accesoDenegado.html';
//}

if (tipoUsuario === "asesor") {
    $("#pageSalario").hide();
    $("#pageUsuarios").hide();
}

//if (!localStorage.getItem('idUser')) {
//   window.location.href = '/pages/accesoDenegado.html';
//} 


function cerrarSesion() {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/index.html';
}