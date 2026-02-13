function showLoader() {
    Swal.fire({
        allowOutsideClick: false,
        showConfirmButton: false,
        background: 'transparent',
        html: `
            <div class="logo-loader">
                <img src="/Images/espera.png" alt="PetCare" class="logo-img" >
            </div>
        `
    });
}

function hideLoader() {
    Swal.close();
}
document.querySelectorAll(".menu-link").forEach(link => {
    link.addEventListener("click", function (e) {
        e.preventDefault(); 

        const url = this.href;

        showLoader();
        
        setTimeout(() => {
            window.location.href = url;
        }, 1000); // ajusta el tiempo
    });
});
