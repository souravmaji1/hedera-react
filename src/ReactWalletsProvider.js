// src/ReactWalletsProvider.js
import React from 'react';
import { HWBridgeProvider } from '@buidlerlabs/hashgraph-react-wallets';
import { HashpackConnector, KabilaConnector } from '@buidlerlabs/hashgraph-react-wallets/connectors';
import { HederaTestnet, HederaMainnet } from '@buidlerlabs/hashgraph-react-wallets/chains';

const metadata = {
  name: 'HTT',
  description: 'Hedera Token Tracker',
  icons: ['https://media.discordapp.net/attachments/1304050235529629726/1319791530583658549/PFP_Textura.png?ex=67863a65&is=6784e8e5&hm=473a628ea826f7d46c9a3bd87eea4d56216b5ce585348814e4d29625c6aa1463&=&format=webp&quality=lossless'], // Puedes colocar la ruta de tu logo si la tienes
  url: window.location.href,
};

const ReactWalletsProvider = ({ children }) => {
  return (
    <HWBridgeProvider
      metadata={metadata}
        projectId={'cf5f905105402b8b39430d5546a0add6'} // Replace with your own Project ID
      connectors={[HashpackConnector]}
      chains={[ HederaTestnet]}
    >
      {children}
    </HWBridgeProvider>
  );
};

export default ReactWalletsProvider;
