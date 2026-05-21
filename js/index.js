// ================= SUPABASE CONFIG =================
const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= EVITAR REFRESH FORM =================
$(document).ready(function () {
    $("form").submit(function (event) {
        event.preventDefault();
    });
});

// ================= LOGIN =================
$("#login").click(async function () {

    let username = $("#username").val();
    let password = $("#password").val();

    if (!username || !password) {
        Swal.fire("Ingrese documento y contraseña");
        return;
    }

    // 🐾 Mostrar loader ANTES del proceso
    showLoader();

    // 1️⃣ Buscar usuario por username en personal_vet
    const { data: vet, error } = await supabaseClient
        .from("personal_vet")
        .select("pv_documento, pv_email, pv_primer_nombre, pv_primer_apellido")
        .eq("pv_username", username)
        .single();

    if (error || !vet) {
        hideLoader();
        Swal.fire("Credenciales incorrectas");
        return;
    }

    // 2️⃣ Verificar estado activo en rol_vet
    const { data: rolVetData, error: errRolVet } = await supabaseClient
        .from("rol_vet")
        .select("rv_estado")
        .eq("rv_pv_documento", vet.pv_documento)
        .single();

    if (errRolVet || !rolVetData || !rolVetData.rv_estado) {
        hideLoader();
        Swal.fire("Su cuenta ha sido desactivada. Contacte al administrador");
        return;
    }

    // 3️⃣ Obtener cargo/rol de info_laboral con join a roles
    const { data: laboral, error: errLaboral } = await supabaseClient
        .from("info_laboral")
        .select("il_cv_id_cargo, roles(rl_id_rol, rl_nombre)")
        .eq("il_pv_documento", vet.pv_documento)
        .single();

    if (errLaboral || !laboral) {
        hideLoader();
        Swal.fire("Credenciales incorrectas");
        return;
    }

    // 4️⃣ Login seguro con Supabase Auth
    const { data, error: errLogin } = await supabaseClient.auth.signInWithPassword({
        email: vet.pv_email,
        password: password
    });

    if (errLogin) {
        hideLoader();
        Swal.fire("Credenciales incorrectas");
        return;
    }

    // 5️⃣ Obtener permisos del rol
    const { data: permisosData, error: errPermisos } = await supabaseClient
        .from("permisos")
        .select("modulos(md_ruta)")
        .eq("pm_rl_id_rol", laboral.il_cv_id_cargo);

    const permisos = (permisosData && !errPermisos)
        ? permisosData.map(p => p.modulos.md_ruta)
        : [];

    // 6️⃣ Guardar sesión y datos de rol/permisos en localStorage
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("nombreVet", vet.pv_primer_nombre);
    localStorage.setItem("rolId", laboral.il_cv_id_cargo);
    localStorage.setItem("rolNombre", laboral.roles.rl_nombre);
    localStorage.setItem("permisos", JSON.stringify(permisos));

    // ⏳ Simular carga profesional
    setTimeout(() => {
        window.location.href = "pages/home.html";
    }, 1200);
});



// ================= MOSTRAR / OCULTAR PASSWORD =================
const pass_field = document.querySelector('.pass-key');
const showBtn = document.querySelector('.show');

showBtn.addEventListener('click', function () {
    if (pass_field.type === "password") {
        pass_field.type = "text";
        showBtn.textContent = "Ocultar";
        showBtn.style.color = "#0f5044";
    } else {
        pass_field.type = "password";
        showBtn.textContent = "Mostrar";
        showBtn.style.color = "#222";
    }
});


// ================= ALERTA CONTACTO ADMIN =================
function mostrarAlerta() {
    Swal.fire({
        text: '¡Por favor contacta a tu administrador!',
        icon: 'info',
        confirmButtonColor: '#0f5044',
        customClass: {
            popup: 'my-swal-popup',
        },
    });
}
