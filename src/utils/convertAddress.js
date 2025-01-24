// src/utils/convertAddress.js
import { AccountId } from "@hashgraph/sdk";

/**
 * Convierte una dirección de Hedera a EVM.
 * @param {string} hederaAddress - Dirección de Hedera (e.g., "0.0.xxxxxx").
 * @returns {string|null} - Dirección EVM (e.g., "0x....") o null si la conversión falla.
 */
export const convertHederaToEVM = (hederaAddress) => {
  try {
    const account = AccountId.fromString(hederaAddress);
    const solidityAddress = account.toSolidityAddress();
    // Verificar que la dirección EVM tenga 40 caracteres hexadecimales
    if (solidityAddress.length !== 40) {
      throw new Error('Dirección EVM inválida después de la conversión.');
    }
    return `0x${solidityAddress}`;
  } catch (err) {
    console.error('Error al convertir dirección de Hedera a EVM:', err);
    return null;
  }
};

/**
 * Convierte una dirección EVM a Hedera.
 * @param {string} evmAddress - Dirección EVM (e.g., "0x....").
 * @returns {string|null} - Dirección de Hedera (e.g., "0.0.xxxxxx") o null si la conversión falla.
 */
export const convertEVMToHedera = (evmAddress) => {
  try {
    if (!evmAddress.startsWith('0x') || evmAddress.length !== 42) {
      throw new Error('Dirección EVM inválida.');
    }
    const account = AccountId.fromSolidityAddress(evmAddress);
    return account.toString();
  } catch (err) {
    console.error('Error al convertir dirección de EVM a Hedera:', err);
    return null;
  }
};
