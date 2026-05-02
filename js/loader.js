function showLoader() {
    // Detect if we're in pages/ subdirectory or root
    const isInPages = window.location.pathname.includes('/pages/');
    const imgPath = isInPages ? '../Images/espera.png' : 'Images/espera.png';

    Swal.fire({
        allowOutsideClick: false,
        showConfirmButton: false,
        background: 'transparent',
        html: `
            <div class="logo-loader">
                <img src="${imgPath}" alt="PetCare" class="logo-img" >
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
