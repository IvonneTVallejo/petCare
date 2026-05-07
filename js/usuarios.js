// ================= CONFIG =================

const SUPABASE_URL = "https://nlqtzidfowoxylporidi.supabase.co";
const SUPABASE_KEY = "sb_publishable_Qe7khKcVgFoN1KpXydGbcA_mEddQQNi";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ================= GLOBAL STATE =================

let usuariosCache = [];
let rolesCache = [];

// ================= INITIALIZATION =================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarRoles();
    await cargarUsuarios();
});

// ================= LOAD USERS =================

async function cargarUsuarios() {
    const { data, error } = await supabaseClient
        .from("personal_vet")
        .select(`
            pv_documento,
            pv_primer_nombre,
            pv_segundo_nombre,
            pv_primer_apellido,
            pv_segundo_apellido,
            pv_td_id_t_documento,
            pv_g_id_genero,
            pv_email,
            pv_username,
            info_laboral (il_pv_documento, il_cv_id_cargo),
            info_contacto (ic_pv_documento, ic_telefono, ic_direccion),
            rol_vet (rv_pv_documento, rv_estado, rv_rol)
        `)
        .order("pv_primer_nombre");

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    usuariosCache = data || [];
    renderizarTablaUsuarios(usuariosCache);
}

function renderizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById("tablaUsuarios");
    tbody.innerHTML = "";

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    No hay usuarios registrados
                </td>
            </tr>`;
        return;
    }

    usuarios.forEach(u => {
        const nombreCompleto = [u.pv_primer_nombre, u.pv_segundo_nombre, u.pv_primer_apellido, u.pv_segundo_apellido]
            .filter(Boolean)
            .join(" ");

        // Get rol name from rolesCache
        const cargoId = u.info_laboral && u.info_laboral.length > 0
            ? u.info_laboral[0].il_cv_id_cargo
            : null;
        const rol = rolesCache.find(r => r.rl_id_rol === cargoId);
        const rolNombre = rol ? rol.rl_nombre : "-";

        // Get estado from rol_vet
        const rolVet = u.rol_vet && u.rol_vet.length > 0 ? u.rol_vet[0] : null;
        const estado = rolVet ? rolVet.rv_estado : false;
        const estadoBadge = estado
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-danger">Inactivo</span>';

        tbody.innerHTML += `
        <tr class="text-center">
            <td>${nombreCompleto}</td>
            <td>${u.pv_documento}</td>
            <td>${u.pv_email || "-"}</td>
            <td>${u.pv_username || "-"}</td>
            <td>${rolNombre}</td>
            <td>${estadoBadge}</td>
            <td>
                <button class="btn btn-success btn-sm btn-editar-usuario" data-documento="${u.pv_documento}" title="Editar">
                    ✏️
                </button>
                <button class="btn ${estado ? 'btn-warning' : 'btn-info'} btn-sm btn-toggle-estado" 
                    data-documento="${u.pv_documento}" 
                    data-estado="${estado}" 
                    title="${estado ? 'Desactivar' : 'Activar'}">
                    ${estado ? '🔒' : '🔓'}
                </button>
                <button class="btn btn-secondary btn-sm btn-reset-password" 
                    data-documento="${u.pv_documento}" 
                    data-email="${u.pv_email}"
                    title="Cambiar contraseña">
                    🔑
                </button>
            </td>
        </tr>`;
    });
}

// ================= LOAD ROLES =================

async function cargarRoles() {
    const { data, error } = await supabaseClient
        .from("roles")
        .select("*")
        .order("rl_id_rol");

    if (error) return;

    rolesCache = data || [];

    // Populate filter select
    const filtroSelect = document.getElementById("filtroRol");
    filtroSelect.innerHTML = '<option value="">Todos los roles</option>';
    rolesCache.forEach(rol => {
        const opt = document.createElement("option");
        opt.value = rol.rl_id_rol;
        opt.textContent = rol.rl_nombre;
        filtroSelect.appendChild(opt);
    });

    // Populate form select
    const formSelect = document.getElementById("usr_rol");
    formSelect.innerHTML = '<option value="">Seleccione</option>';
    rolesCache.forEach(rol => {
        const opt = document.createElement("option");
        opt.value = rol.rl_id_rol;
        opt.textContent = rol.rl_nombre;
        formSelect.appendChild(opt);
    });
}

// ================= CREATE USER =================

async function crearUsuario(formData) {
    // Validate unique documento
    const { data: existDoc } = await supabaseClient
        .from("personal_vet")
        .select("pv_documento")
        .eq("pv_documento", formData.documento)
        .maybeSingle();

    if (existDoc) {
        await Swal.fire({
            title: "Duplicado",
            text: "El documento ya está registrado en el sistema.",
            icon: "error"
        });
        return;
    }

    // Validate unique email
    const { data: existEmail } = await supabaseClient
        .from("personal_vet")
        .select("pv_documento")
        .eq("pv_email", formData.email)
        .maybeSingle();

    if (existEmail) {
        await Swal.fire({
            title: "Duplicado",
            text: "El email ya está registrado en el sistema.",
            icon: "error"
        });
        return;
    }

    // Validate unique username
    const { data: existUser } = await supabaseClient
        .from("personal_vet")
        .select("pv_documento")
        .eq("pv_username", formData.username)
        .maybeSingle();

    if (existUser) {
        await Swal.fire({
            title: "Duplicado",
            text: "El username ya está registrado en el sistema.",
            icon: "error"
        });
        return;
    }

    // Validate password
    if (!formData.contrasena || formData.contrasena.length < 6) {
        await Swal.fire({
            title: "Error de validación",
            text: "La contraseña debe tener mínimo 6 caracteres.",
            icon: "warning"
        });
        return;
    }

    if (formData.contrasena !== formData.confirmarContrasena) {
        await Swal.fire({
            title: "Error de validación",
            text: "Las contraseñas no coinciden.",
            icon: "warning"
        });
        return;
    }

    // 1. Insert into personal_vet
    const { error: errPersonal } = await supabaseClient
        .from("personal_vet")
        .insert({
            pv_documento: formData.documento,
            pv_primer_nombre: formData.primerNombre,
            pv_segundo_nombre: formData.segundoNombre || null,
            pv_primer_apellido: formData.primerApellido,
            pv_segundo_apellido: formData.segundoApellido || null,
            pv_td_id_t_documento: formData.tipoDocumento,
            pv_g_id_genero: formData.genero,
            pv_email: formData.email,
            pv_username: formData.username
        });

    if (errPersonal) {
        await Swal.fire({ title: "Error", text: errPersonal.message, icon: "error" });
        return;
    }

    // 2. Insert into info_laboral
    const hoy = new Date().toISOString().split("T")[0];
    const { error: errLaboral } = await supabaseClient
        .from("info_laboral")
        .insert({
            il_pv_documento: formData.documento,
            il_cv_id_cargo: formData.rolId,
            il_salario: 0,
            il_m_id_moneda: 1,
            il_fecha_ingreso: hoy
        });

    if (errLaboral) {
        await Swal.fire({ title: "Error", text: errLaboral.message, icon: "error" });
        return;
    }

    // 3. Insert into info_contacto
    const { error: errContacto } = await supabaseClient
        .from("info_contacto")
        .insert({
            ic_pv_documento: formData.documento,
            ic_telefono: formData.telefono ? parseInt(formData.telefono) : 0,
            ic_direccion: formData.direccion || 'Sin dirección',
            ic_contacto_emer: 0,
            ic_contacto_emer_nom: "N/A"
        });

    if (errContacto) {
        await Swal.fire({ title: "Error", text: errContacto.message, icon: "error" });
        return;
    }

    // 4. Insert into rol_vet
    const rolNombre = rolesCache.find(r => r.rl_id_rol === formData.rolId)?.rl_nombre || "";
    const { error: errRolVet } = await supabaseClient
        .from("rol_vet")
        .insert({
            rv_rol: rolNombre,
            rv_usuario: formData.username,
            rv_ultimo_login: hoy,
            rv_permisos: "",
            rv_estado: formData.estado,
            rv_pv_documento: formData.documento
        });

    if (errRolVet) {
        await Swal.fire({ title: "Error", text: errRolVet.message, icon: "error" });
        return;
    }

    // 5. Create Supabase Auth user using custom SQL function (no email confirmation needed)
    const { data: authResult, error: errAuth } = await supabaseClient
        .rpc('crear_usuario_auth', {
            p_email: formData.email,
            p_password: formData.contrasena
        });

    if (errAuth) {
        await Swal.fire({
            title: "Error al crear cuenta",
            text: "No se pudo crear la cuenta de autenticación: " + errAuth.message,
            icon: "error"
        });
        return;
    }

    await Swal.fire({
        title: "Usuario registrado",
        text: "El usuario ha sido creado exitosamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalUsuario').modal('hide');
    document.getElementById("formUsuario").reset();
    document.getElementById("pv_documento_edit").value = "";

    await cargarUsuarios();
}

// ================= EDIT USER =================

async function editarUsuario(documento, formData) {
    // 1. Update personal_vet
    const { error: errPersonal } = await supabaseClient
        .from("personal_vet")
        .update({
            pv_primer_nombre: formData.primerNombre,
            pv_segundo_nombre: formData.segundoNombre || null,
            pv_primer_apellido: formData.primerApellido,
            pv_segundo_apellido: formData.segundoApellido || null,
            pv_td_id_t_documento: formData.tipoDocumento,
            pv_email: formData.email,
            pv_username: formData.username
        })
        .eq("pv_documento", documento);

    if (errPersonal) {
        await Swal.fire({ title: "Error", text: errPersonal.message, icon: "error" });
        return;
    }

    // 2. Upsert info_laboral (insert if not exists, update if exists)
    const { data: existLaboral } = await supabaseClient
        .from("info_laboral")
        .select("il_id_info_laboral")
        .eq("il_pv_documento", documento)
        .maybeSingle();

    if (existLaboral) {
        const { error: errLaboral } = await supabaseClient
            .from("info_laboral")
            .update({ il_cv_id_cargo: formData.rolId })
            .eq("il_pv_documento", documento);
        if (errLaboral) {
            await Swal.fire({ title: "Error", text: errLaboral.message, icon: "error" });
            return;
        }
    } else {
        const hoy = new Date().toISOString().split("T")[0];
        const { error: errLaboral } = await supabaseClient
            .from("info_laboral")
            .insert({ il_pv_documento: documento, il_cv_id_cargo: formData.rolId, il_salario: 0, il_m_id_moneda: 1, il_fecha_ingreso: hoy });
        if (errLaboral) {
            await Swal.fire({ title: "Error", text: errLaboral.message, icon: "error" });
            return;
        }
    }

    // 3. Upsert info_contacto
    const { data: existContacto } = await supabaseClient
        .from("info_contacto")
        .select("ic_id_info_contacto")
        .eq("ic_pv_documento", documento)
        .maybeSingle();

    if (existContacto) {
        const { error: errContacto } = await supabaseClient
            .from("info_contacto")
            .update({ ic_telefono: formData.telefono || null, ic_direccion: formData.direccion || null })
            .eq("ic_pv_documento", documento);
        if (errContacto) {
            await Swal.fire({ title: "Error", text: errContacto.message, icon: "error" });
            return;
        }
    } else {
        const { error: errContacto } = await supabaseClient
            .from("info_contacto")
            .insert({ ic_pv_documento: documento, ic_telefono: formData.telefono ? parseInt(formData.telefono) : 0, ic_direccion: formData.direccion || 'Sin dirección', ic_contacto_emer: 0, ic_contacto_emer_nom: 'N/A' });
        if (errContacto) {
            await Swal.fire({ title: "Error", text: errContacto.message, icon: "error" });
            return;
        }
    }

    // 4. Upsert rol_vet
    const rolNombre = rolesCache.find(r => r.rl_id_rol === formData.rolId)?.rl_nombre || "";
    const { data: existRolVet } = await supabaseClient
        .from("rol_vet")
        .select("rv_id_rol")
        .eq("rv_pv_documento", documento)
        .maybeSingle();

    if (existRolVet) {
        const { error: errRolVet } = await supabaseClient
            .from("rol_vet")
            .update({ rv_rol: rolNombre, rv_usuario: formData.username, rv_estado: formData.estado })
            .eq("rv_pv_documento", documento);
        if (errRolVet) {
            await Swal.fire({ title: "Error", text: errRolVet.message, icon: "error" });
            return;
        }
    } else {
        const hoy = new Date().toISOString().split("T")[0];
        const { error: errRolVet } = await supabaseClient
            .from("rol_vet")
            .insert({ rv_rol: rolNombre, rv_usuario: formData.username, rv_ultimo_login: hoy, rv_permisos: '', rv_estado: formData.estado, rv_pv_documento: documento });
        if (errRolVet) {
            await Swal.fire({ title: "Error", text: errRolVet.message, icon: "error" });
            return;
        }
    }

    await Swal.fire({
        title: "Usuario actualizado",
        text: "Los datos del usuario han sido actualizados.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });

    $('#modalUsuario').modal('hide');
    document.getElementById("formUsuario").reset();
    document.getElementById("pv_documento_edit").value = "";

    await cargarUsuarios();
}

// ================= TOGGLE USER STATE =================

async function toggleEstadoUsuario(documento, nuevoEstado) {
    const accion = nuevoEstado ? "activar" : "desactivar";

    const result = await Swal.fire({
        title: `¿${nuevoEstado ? 'Activar' : 'Desactivar'} usuario?`,
        text: `¿Está seguro de ${accion} este usuario?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, confirmar",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    const { error } = await supabaseClient
        .from("rol_vet")
        .update({ rv_estado: nuevoEstado })
        .eq("rv_pv_documento", documento);

    if (error) {
        await Swal.fire({ title: "Error", text: error.message, icon: "error" });
        return;
    }

    await Swal.fire({
        title: `Usuario ${nuevoEstado ? 'activado' : 'desactivado'}`,
        icon: "success",
        timer: 1500,
        showConfirmButton: false
    });

    await cargarUsuarios();
}

// ================= FILTER USERS =================

function filtrarUsuarios() {
    const filtroRol = document.getElementById("filtroRol").value;
    const filtroEstado = document.getElementById("filtroEstado").value;

    let filtrados = usuariosCache;

    if (filtroRol) {
        const rolId = parseInt(filtroRol);
        filtrados = filtrados.filter(u => {
            const cargoId = u.info_laboral && u.info_laboral.length > 0
                ? u.info_laboral[0].il_cv_id_cargo
                : null;
            return cargoId === rolId;
        });
    }

    if (filtroEstado !== "") {
        const estadoBool = filtroEstado === "true";
        filtrados = filtrados.filter(u => {
            const rolVet = u.rol_vet && u.rol_vet.length > 0 ? u.rol_vet[0] : null;
            const estado = rolVet ? rolVet.rv_estado : false;
            return estado === estadoBool;
        });
    }

    renderizarTablaUsuarios(filtrados);
}

// ================= EVENT LISTENERS =================

// Form submit
document.getElementById("formUsuario")
    .addEventListener("submit", async function (e) {
        e.preventDefault();

        const documentoEdit = document.getElementById("pv_documento_edit").value;

        const formData = {
            primerNombre: document.getElementById("pv_primer_nombre").value.trim(),
            segundoNombre: document.getElementById("pv_segundo_nombre").value.trim(),
            primerApellido: document.getElementById("pv_primer_apellido").value.trim(),
            segundoApellido: document.getElementById("pv_segundo_apellido").value.trim(),
            tipoDocumento: parseInt(document.getElementById("pv_td_id_t_documento").value),
            genero: parseInt(document.getElementById("pv_g_id_genero").value) || 3,
            documento: parseInt(document.getElementById("pv_documento").value),
            email: document.getElementById("pv_email").value.trim(),
            username: document.getElementById("pv_username").value.trim(),
            telefono: document.getElementById("ic_telefono").value.trim(),
            direccion: document.getElementById("ic_direccion").value.trim(),
            rolId: parseInt(document.getElementById("usr_rol").value),
            estado: document.getElementById("usr_estado").checked
        };

        // Validate required fields
        if (!formData.primerNombre || !formData.primerApellido || !formData.tipoDocumento ||
            !formData.documento || !formData.email || !formData.username || !formData.rolId) {
            await Swal.fire({
                title: "Campos incompletos",
                text: "Por favor complete todos los campos obligatorios.",
                icon: "warning"
            });
            return;
        }

        if (documentoEdit) {
            // Edit mode
            await editarUsuario(parseInt(documentoEdit), formData);
        } else {
            // Create mode - also get password fields
            formData.contrasena = document.getElementById("usr_contrasena").value;
            formData.confirmarContrasena = document.getElementById("usr_confirmar_contrasena").value;
            await crearUsuario(formData);
        }
    });

// Filter event listeners
document.getElementById("filtroRol")
    .addEventListener("change", filtrarUsuarios);

document.getElementById("filtroEstado")
    .addEventListener("change", filtrarUsuarios);

// Event delegation for edit and toggle buttons
document.addEventListener("click", async function (e) {
    // Edit user button
    const btnEditar = e.target.closest(".btn-editar-usuario");
    if (btnEditar) {
        const documento = parseInt(btnEditar.dataset.documento);
        await abrirEditarUsuario(documento);
        return;
    }

    // Toggle state button
    const btnToggle = e.target.closest(".btn-toggle-estado");
    if (btnToggle) {
        const documento = parseInt(btnToggle.dataset.documento);
        const estadoActual = btnToggle.dataset.estado === "true";
        await toggleEstadoUsuario(documento, !estadoActual);
        return;
    }

    // Reset password button
    const btnReset = e.target.closest(".btn-reset-password");
    if (btnReset) {
        const email = btnReset.dataset.email;
        await resetearContrasena(email);
        return;
    }
});

// "Nuevo Usuario" button - reset form
document.getElementById("btnNuevoUsuario")
    .addEventListener("click", function () {
        document.getElementById("formUsuario").reset();
        document.getElementById("pv_documento_edit").value = "";
        document.getElementById("pv_documento").disabled = false;
        document.getElementById("camposContrasena").style.display = "block";
        document.getElementById("usr_estado").checked = true;
        document.getElementById("modalUsuarioLabel").textContent = "Registro de Usuario";
    });

// ================= OPEN EDIT USER =================

async function abrirEditarUsuario(documento) {
    const usuario = usuariosCache.find(u => u.pv_documento === documento);
    if (!usuario) return;

    // Set hidden field for edit mode
    document.getElementById("pv_documento_edit").value = documento;

    // Fill form fields
    document.getElementById("pv_primer_nombre").value = usuario.pv_primer_nombre || "";
    document.getElementById("pv_segundo_nombre").value = usuario.pv_segundo_nombre || "";
    document.getElementById("pv_primer_apellido").value = usuario.pv_primer_apellido || "";
    document.getElementById("pv_segundo_apellido").value = usuario.pv_segundo_apellido || "";
    document.getElementById("pv_td_id_t_documento").value = usuario.pv_td_id_t_documento || "";
    document.getElementById("pv_g_id_genero").value = usuario.pv_g_id_genero || "";
    document.getElementById("pv_documento").value = usuario.pv_documento;
    document.getElementById("pv_documento").disabled = true;
    document.getElementById("pv_email").value = usuario.pv_email || "";
    document.getElementById("pv_username").value = usuario.pv_username || "";

    // Contact info
    const contacto = usuario.info_contacto && usuario.info_contacto.length > 0 ? usuario.info_contacto[0] : null;
    document.getElementById("ic_telefono").value = contacto ? contacto.ic_telefono || "" : "";
    document.getElementById("ic_direccion").value = contacto ? contacto.ic_direccion || "" : "";

    // Rol
    const cargoId = usuario.info_laboral && usuario.info_laboral.length > 0
        ? usuario.info_laboral[0].il_cv_id_cargo
        : "";
    document.getElementById("usr_rol").value = cargoId;

    // Estado
    const rolVet = usuario.rol_vet && usuario.rol_vet.length > 0 ? usuario.rol_vet[0] : null;
    document.getElementById("usr_estado").checked = rolVet ? rolVet.rv_estado : false;

    // Hide password fields in edit mode
    document.getElementById("camposContrasena").style.display = "none";

    // Update modal title
    document.getElementById("modalUsuarioLabel").textContent = "Edición de Usuario";

    $('#modalUsuario').modal('show');
}


// ================= RESET PASSWORD =================

async function resetearContrasena(email) {
    const { value: nuevaContrasena } = await Swal.fire({
        title: "Cambiar Contraseña",
        input: "password",
        inputLabel: `Nueva contraseña para: ${email}`,
        inputPlaceholder: "Mínimo 6 caracteres",
        inputAttributes: {
            minlength: 6
        },
        showCancelButton: true,
        confirmButtonText: "Cambiar",
        cancelButtonText: "Cancelar",
        inputValidator: (value) => {
            if (!value || value.length < 6) {
                return "La contraseña debe tener mínimo 6 caracteres";
            }
        }
    });

    if (!nuevaContrasena) return;

    // Use Supabase Auth to update password
    // Note: This requires the admin to be logged in and uses updateUser
    const { error } = await supabaseClient.auth.updateUser({
        password: nuevaContrasena
    });

    if (error) {
        // If updateUser fails (because it updates the CURRENT user), 
        // try sending a password reset email instead
        const { error: errReset } = await supabaseClient.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/index.html'
        });

        if (errReset) {
            await Swal.fire({
                title: "Error",
                text: "No se pudo cambiar la contraseña: " + errReset.message,
                icon: "error"
            });
            return;
        }

        await Swal.fire({
            title: "Email enviado",
            text: `Se envió un enlace de recuperación a ${email}`,
            icon: "info"
        });
        return;
    }

    await Swal.fire({
        title: "Contraseña actualizada",
        text: "La contraseña ha sido cambiada exitosamente.",
        icon: "success",
        timer: 2000,
        showConfirmButton: false
    });
}
