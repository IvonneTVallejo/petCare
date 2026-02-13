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

    let documento = $("#username").val();
    let password = $("#password").val();

    if (!documento || !password) {
        Swal.fire("Ingrese documento y contraseña");
        return;
    }

    // 🐾 Mostrar loader ANTES del proceso
    showLoader();

    // 1️⃣ Buscar email del documento
    const { data: vet, error } = await supabaseClient
        .from("personal_vet")
        .select("pv_email, pv_primer_nombre, pv_primer_apellido")
        .eq("pv_documento", Number(documento))
        .single();

    if (error || !vet) {
        hideLoader();
        Swal.fire("Documento no registrado");
        return;
    }

    // 2️⃣ Login seguro con Supabase
    const { data, error: errLogin } = await supabaseClient.auth.signInWithPassword({
        email: vet.pv_email,
        password: password
    });

    if (errLogin) {
        hideLoader();
        Swal.fire("Contraseña incorrecta");
        return;
    }

    // 3️⃣ Guardar sesión
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("nombreVet", vet.pv_primer_nombre );

    // 4️⃣ Obtener rol
    const { data: rol } = await supabaseClient
        .from("rol_vet")
        .select("rv_rol")
        .eq("rv_user_id", data.user.id)
        .single();

    //localStorage.setItem("rol", rol.rv_rol);

    // ⏳ Simular carga profesional
    setTimeout(() => {
        window.location.href = "/pages/home.html";
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
