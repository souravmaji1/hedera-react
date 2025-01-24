const fs = require('fs');

// Generar lista de wallets
const feeAccounts = [];
for (let i = 1; i <= 4000; i++) {
  feeAccounts.push(`0.0.${i}`);
}

// Crear el objeto JSON
const data = {
  feeAccounts,
};

// Guardar en un archivo JSON
fs.writeFileSync('hederawallets.json', JSON.stringify(data, null, 2));

console.log('Archivo hederawallets.json generado con éxito.');
