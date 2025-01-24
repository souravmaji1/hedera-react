// src/Wallet.js
import React from 'react';
import { useWallet } from "@buidlerlabs/hashgraph-react-wallets";
import { HWCConnector } from "@buidlerlabs/hashgraph-react-wallets/connectors";
import './Wallet.css'; // Opcional: estilos para el botón
import { HashpackConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors'

function Wallet() {
  const { connect, disconnect, isConnected } = useWallet(HashpackConnector);

  return (
    <div>
      {isConnected ? (
        <button className="btn-wallet disconnect" onClick={() => disconnect()}>
          Desconectar Wallet
        </button>
      ) : (
        <button className="btn-wallet connect" onClick={() => connect()}>
          Conectar Wallet
        </button>
      )}
    </div>
  );
}

export default Wallet;
