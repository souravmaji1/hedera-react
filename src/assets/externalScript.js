// src/assets/externalScript.js

// Ejemplo de script externo para animaciones o interacciones
document.addEventListener("DOMContentLoaded", () => {
    const promoElement = document.querySelector(".external-promo");
    if (promoElement) {
      promoElement.innerHTML += `
        <img src="path_to_promo_icon.png" alt="Promo Icon" />
        <p>¡Aprovecha nuestra promoción exclusiva!</p>
      `;
    }
  });
  