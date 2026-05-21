// ================= AUTH GUARD =================
// Include this script in ALL protected pages BEFORE other logic scripts

const SUPABASE_URL_AUTH = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY_AUTH = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";
const supabaseAuth = supabase.createClient(SUPABASE_URL_AUTH, SUPABASE_KEY_AUTH);

// Module map for sidebar rendering (icon + name + route)
const MODULOS_SIDEBAR = [
    { nombre: 'Inicio', ruta: 'home.html', icono: '../Images/inicio.png' },
    { nombre: 'Pacientes', ruta: 'pacientes.html', icono: '../Images/dueno-de-una-mascota.png' },
    { nombre: 'Agenda', ruta: 'agenda.html', icono: '../Images/agenda.png' },
    { nombre: 'Inventario', ruta: 'inventario.html', icono: '../Images/inventario.svg' },
    { nombre: 'Proveedores', ruta: 'proveedores.html', icono: '../Images/proveedores.svg' },
    { nombre: 'Compras', ruta: 'compras.html', icono: '../Images/compras.svg' },
    { nombre: 'Ventas', ruta: 'ventas.html', icono: '../Images/ventas.svg' },
    { nombre: 'Reportes', ruta: 'reportes.html', icono: '../Images/reportes.svg' },
    { nombre: 'Hospitalización', ruta: 'hospitalizacion.html', icono: '../Images/informe-medico.png' },
    { nombre: 'Usuarios', ruta: 'usuarios.html', icono: '../Images/sesion.png' }
];

async function initAuthGuard() {
    // 1. Check session
    const { data: { session } } = await supabaseAuth.auth.getSession();

    if (!session) {
        window.location.href = '../index.html';
        return;
    }

    // 2. Get permissions from cache
    let permisos = obtenerPermisosCacheados();

    if (!permisos) {
        // Fetch from DB
        const rolId = localStorage.getItem('rolId');
        if (!rolId) {
            window.location.href = '../index.html';
            return;
        }

        const { data, error } = await supabaseAuth
            .from("permisos")
            .select("modulos(md_ruta)")
            .eq("pm_rl_id_rol", parseInt(rolId));

        if (error || !data) {
            window.location.href = '../index.html';
            return;
        }

        permisos = data.map(p => p.modulos.md_ruta);
        localStorage.setItem('permisos', JSON.stringify(permisos));
    }

    // 3. Check current page permission
    const paginaActual = window.location.pathname.split('/').pop();

    // Pages that don't need permission check (always accessible if logged in)
    const paginasLibres = ['accesoDenegado.html', 'cambiarContrasena.html', 'mascotas.html', 'consultas.html', 'reporte_formula.html'];

    if (!paginasLibres.includes(paginaActual) && !permisos.includes(paginaActual)) {
        window.location.href = 'accesoDenegado.html';
        return;
    }

    // 4. Render sidebar dynamically
    renderizarSidebar(permisos);
}

function obtenerPermisosCacheados() {
    const cached = localStorage.getItem('permisos');
    if (!cached) return null;
    try {
        return JSON.parse(cached);
    } catch {
        return null;
    }
}

function renderizarSidebar(permisosUsuario) {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;

    navLinks.innerHTML = '';

    MODULOS_SIDEBAR.forEach(modulo => {
        if (permisosUsuario.includes(modulo.ruta)) {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${modulo.ruta}" class="menu-link">
                    <i><img src="${modulo.icono}" class="user-icon"></i>
                    <span class="link-name">${modulo.nombre}</span>
                </a>
            `;
            navLinks.appendChild(li);
        }
    });
}

function cerrarSesion() {
    supabaseAuth.auth.signOut().then(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '../index.html';
    });
}

// Listen for auth state changes (session expiry)
supabaseAuth.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        localStorage.clear();
        window.location.href = '../index.html';
    }
});

// Execute on page load
document.addEventListener("DOMContentLoaded", initAuthGuard);
