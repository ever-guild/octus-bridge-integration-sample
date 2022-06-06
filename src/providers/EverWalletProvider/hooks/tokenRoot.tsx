import {Address, Contract} from 'everscale-inpage-provider';
import {TokenAbi} from '@/misc/ever-abi';
import {useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';

export type TokenRootMetadata = {
    symbol: string;
    decimals: number;
    address: Address;
};

export function useTokenRootContract(rootAddress: Address | undefined): Contract<typeof TokenAbi.Root> | undefined {
    const [contract, setContract] = useState<Contract<typeof TokenAbi.Root> | undefined>(undefined);
    const {connectionStatus} = useEverWallet();

    useEffect(
        function () {
            if (connectionStatus === EverWalletConnectionStatus.Ok && rootAddress !== undefined) {
                setContract(new rpc.Contract(TokenAbi.Root, rootAddress));
            }
            return () => {
                setContract(undefined);
            };
        },
        [connectionStatus],
    );

    return contract;
}

export function useTokenRoot(rootAddress: Address | undefined): TokenRootMetadata | undefined {
    const [decimals, setDecimals] = useState<number | undefined>(undefined);
    const [symbol, setSymbol] = useState<string | undefined>(undefined);

    const rootContract = useTokenRootContract(rootAddress);

    useEffect(
        function () {
            let stale = false;
            if (rootContract !== undefined) {
                rootContract.methods
                    .decimals({answerId: 0})
                    .call()
                    .then(({value0: decimals}) => {
                        if (!stale && !isNaN(parseInt(decimals))) {
                            setDecimals(parseInt(decimals));
                        }
                    });
                rootContract.methods
                    .symbol({answerId: 0})
                    .call()
                    .then(({value0: symbol}) => {
                        !stale && setSymbol(symbol);
                    });
            }
            return () => {
                stale = true;
                setDecimals(undefined);
                setSymbol(undefined);
            };
        },
        [rootContract],
    );

    if (decimals !== undefined && symbol !== undefined && rootAddress !== undefined) {
        return {
            decimals,
            symbol,
            address: rootAddress,
        };
    }
    return undefined;
}
