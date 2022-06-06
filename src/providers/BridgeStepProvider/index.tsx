import React, {createContext, useState} from 'react';
import BigNumber from 'bignumber.js';

// We use context provider instead of router just because router is the good place for social engineering,
export enum BridgeStep {
    Select,
    Prepare,
    Transfer,
}

export enum TransferRoute {
    EvmEverscale,
    EverscaleEvm,
    EvmEvm,
}

export enum TransferType {
    Default = 'default',
    Credit = 'credit',
}

// All invariants for supported scenarios
export type BridgeStepData =
    | {
          // Select route and assets
          step: BridgeStep.Select;
      }
    | {
          // Check limits for default transfer
          step: BridgeStep.Prepare;
          route: TransferRoute.EvmEverscale;
          sourceNetworkId: string;
          destinationNetworkId: 'everscale-1';
          vaultEvmAddress: string;
          type: TransferType.Default | TransferType.Credit;
      }
    | {
          step: BridgeStep.Prepare;
          route: TransferRoute.EverscaleEvm;
          sourceNetworkId: 'everscale-1';
          destinationNetworkId: string;
          vaultEvmAddress: string;
          type: TransferType.Default;
      }
    | {
          step: BridgeStep.Transfer;
          route: TransferRoute.EvmEverscale;
          type: TransferType.Default;
          sourceNetworkId: string;
          destinationNetworkId: 'everscale-1';
          vaultEvmAddress: string;

          // Actually we need (amount and destinationAddress) or (depositTxHash).
          // Because if we have depositTxHash we can fetch amount and destinationAddress from deposit tx.
          amount?: BigNumber;
          destinationAddress?: string;
          depositTxHash?: string;
      }
    | {
          step: BridgeStep.Transfer;
          route: TransferRoute.EvmEverscale;
          type: TransferType.Credit;
          sourceNetworkId: string;
          destinationNetworkId: 'everscale-1';
          vaultEvmAddress: string;

          // Actually we need (amount and destinationAddress and minEversAmount and minTokensAmount) or (depositTxHash).
          // Because if we have depositTxHash we can fetch amount and destinationAddress && minEversAmount && minTokensAmount from deposit tx.
          amount?: BigNumber;
          minEversAmount?: BigNumber;
          minTokensAmount?: BigNumber;
          destinationAddress?: string;
          depositTxHash?: string;
      }
    | {
          step: BridgeStep.Transfer;
          route: TransferRoute.EverscaleEvm;
          type: TransferType.Default;
          sourceNetworkId: 'everscale-1';
          destinationNetworkId: string;
          vaultEvmAddress: string;

          // Actually we need (amount and destinationAddress) or (eventAddress).
          // Because if we have eventAddress we can fetch amount and destinationAddress from event contract.
          amountTip3Decimals?: BigNumber;
          destinationAddress?: string;
          eventAddress?: string;
          releaseTxHash?: string;
      };

export type BridgeProviderType = {
    setStep: (step: BridgeStepData) => void;
    state: BridgeStepData;
};

export const BridgeStepContext = createContext<BridgeProviderType>({
    setStep: () => null,
    state: {
        step: BridgeStep.Select,
    },
});

export interface BridgeStepProviderProps {
    children: React.ReactNode;
}

export const BridgeProvider: React.FunctionComponent<BridgeStepProviderProps> = ({children}) => {
    const [state, setStep] = useState<BridgeStepData>({
        step: BridgeStep.Select,
    });

    return <BridgeStepContext.Provider value={{state, setStep}}>{children}</BridgeStepContext.Provider>;
};
