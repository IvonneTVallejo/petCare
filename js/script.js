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
});

var username = localStorage.getItem("nombreVet");

var usernameDisplay = document.getElementById("usernameDisplay");
usernameDisplay.innerHTML = `<img src="../Images/sesion.png" /> Usuario: ${username}`;


// Fallback cerrarSesion — auth-guard.js defines this if loaded first
if (typeof cerrarSesion !== 'function') {
    window.cerrarSesion = function() {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '../index.html';
    };
}
