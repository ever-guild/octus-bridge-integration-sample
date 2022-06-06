import {DecodedAbiFunctionInputs} from 'everscale-inpage-provider';
import {TokenAbi} from '@/misc/ever-abi';

export type EverTokenAsset = {
    name: string;
    chainId: string;
    symbol: string;
    decimals: number;
    rootAddress: string;
    icon: string;
    version: number;
    vendor: string | null;
    verified: boolean;
};

// export type Token = {
//     balance?: string;
//     chainId?: string;
//     decimals: number;
//     icon?: string;
//     name?: string;
//     root: string;
//     rootOwnerAddress?: Address;
//     symbol: string;
//     totalSupply?: string;
//     updatedAt?: number;
//     vendor?: string | null;
//     verified?: boolean;
//     wallet?: string;
// }

export type EthereumConfigurationDepositType = 'default' | 'credit';

export enum EvmWalletConnectionStatus {
    Initializing,
    NotInstalled,
    NotConnected,
    HasWrongNetwork,
    Ok,
}

export enum EverWalletConnectionStatus {
    Initializing,
    NotInstalled,
    NotConnected,
    Ok,
}

export type EvmVaultConfig = {
    vaultEvmAddress: string;
    tokenEvmAddress: string;
    chainId: string;
    tip3RootAddress: string;
    tip3ProxyAddress: string;
    ethereumConfigurationAddress: string;
    depositType: EthereumConfigurationDepositType;
};

export type NetworkType = 'evm' | 'everscale';

export type ChainId = string;

export type NetworkShape = {
    chainId: ChainId;
    currencySymbol: string;
    explorerBaseUrl: string;
    id: string;
    label: string;
    name: string;
    rpcUrl: string;
    tokenType?: string;
    transactionType?: string;
    type: NetworkType;
};

export type EthEventVoteData = DecodedAbiFunctionInputs<typeof TokenAbi.EthEventConfig, 'deployEvent'>['eventVoteData'];
export type EverscaleEventVoteData = DecodedAbiFunctionInputs<
    typeof TokenAbi.EverscaleEventConfiguration,
    'deployEvent'
>['eventVoteData'];
