import React from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { CSSProperties } from "react";

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const defaultClient = React.useMemo(() => {
    return import.meta.env.VITE_IS_MAINNET === "true"
      ? new ccc.ClientPublicMainnet()
      : new ccc.ClientPublicTestnet();
  }, []);

  const filterWallets = React.useCallback(
    async (signerInfo: ccc.SignerInfo, wallet: ccc.Wallet) => {
      const allowedWallets = ['JoyID Passkey', 'MetaMask', 'UTXO Global Wallet'];
      
      // Only show allowed wallets
      if (!allowedWallets.includes(wallet.name)) {
        return false;
      }
      
      // For JoyID, only show CKB network (filter out BTC and other chains)
      if (wallet.name === 'JoyID Passkey') {
        return signerInfo.name.includes('CKB') || 
               signerInfo.name.includes('Nervos');
      }
      
      return true;
    },
    []
  );

  return (
    <ccc.Provider
      signerFilter={filterWallets}
      connectorProps={{
        style: {
          "--background": "#000000",
          "--divider": "#DBAB00",
          "--btn-primary": "#2c2200",
          "--btn-primary-hover": "#423300",
          "--btn-secondary": "#1a1a1a",
          "--btn-secondary-hover": "#2a2a2a",
          "--icon-primary": "#DBAB00",
          "--icon-secondary": "#DBAB00",
          "color": "#DBAB00",
          "--tip-color": "#999999",
          "boxShadow": "0 0 0 2px #DBAB00",
          "--border-radius": "12px",
        } as CSSProperties,
        className: "ccc-wallet-connector",
      }}
      defaultClient={defaultClient}
      clientOptions={[
        {
          name: "CKB Testnet",
          client: new ccc.ClientPublicTestnet(),
        },
        {
          name: "CKB Mainnet",
          client: new ccc.ClientPublicMainnet(),
        },
      ]}
    >
      {children}
    </ccc.Provider>
  );
}