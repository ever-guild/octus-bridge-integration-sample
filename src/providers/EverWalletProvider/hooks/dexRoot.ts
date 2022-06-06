import {Contract} from 'everscale-inpage-provider';
import {DexAbi} from '@/misc/ever-abi';
import {useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {DexRootAddress, rpc, useEverWallet} from '@/providers/EverWalletProvider';

export const useDexRootContract = function (): Contract<typeof DexAbi.Root> | undefined {
    const {connectionStatus} = useEverWallet();
    const [contract, setContract] = useState<Contract<typeof DexAbi.Root> | undefined>(undefined);

    useEffect(() => {
        if (connectionStatus === EverWalletConnectionStatus.Ok) {
            setContract(new rpc.Contract(DexAbi.Root, DexRootAddress));
        }
        return () => {
            setContract(undefined);
        };
    }, [connectionStatus]);

    return contract;
};
