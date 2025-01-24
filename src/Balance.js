// src/Balance.js
import React from "react";
import { useTokensBalance } from "@buidlerlabs/hashgraph-react-wallets";
import { HWCConnector } from "@buidlerlabs/hashgraph-react-wallets/connectors";
import PropTypes from "prop-types";

const Balance = ({ tokenId, decimals, symbol }) => {
  // Obtener el balance del token usando hashgraph-react-wallets
  const { data: tokensBalance } = useTokensBalance({
    tokens: tokenId ? [tokenId] : [],
    connector: HWCConnector,
  });

  // Calcular el balance (sin HBAR, solo este token).
  // - Dividir por 10^decimals si "decimals" > 0.
  // - Formatear con 2 decimales como máximo para FT, entero para NFT.
  let tokenBalance = "0";

  if (tokenId && tokensBalance?.length) {
    const rawBalance =
      tokensBalance.find((t) => t.token_id === tokenId)?.balance ?? "0";
    const adjusted = parseFloat(rawBalance) / Math.pow(10, decimals);

    if (decimals > 0) {
      // FT: Mostrar con dos decimales
      tokenBalance = adjusted.toLocaleString("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } else {
      // NFT: Mostrar como entero
      tokenBalance = Math.floor(adjusted).toLocaleString("es-ES");
    }
  }

  return (
    <div className="balance-container">
      {tokenId ? (
        // Mostrar el balance seguido del símbolo del token
        <p className="balance-text">{`${tokenBalance} ${symbol}`}</p>
      ) : (
        // Mostrar balance predeterminado cuando no se ha seleccionado ningún token
        <p className="balance-text">0 $</p>
      )}
    </div>
  );
};

Balance.propTypes = {
  tokenId: PropTypes.string.isRequired,
  decimals: PropTypes.number.isRequired,
  symbol: PropTypes.string.isRequired,
};

export default Balance;
