import {Address} from 'everscale-inpage-provider';
import {useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {TokenAbi} from '@/misc/ever-abi';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';

export type ProxyData = {
    isPaused: boolean;
    everscaleConfigurationAddress: Address;
    evmConfigurationAddresses: Address[];
    tokenRoot: Address;
};

export function useEvmTokenTransferProxy(address: string | undefined): ProxyData | undefined {
    const {connectionStatus} = useEverWallet();
    const [isPaused, setIsPaused] = useState<boolean | undefined>(undefined);
    const [everscaleConfigurationAddress, setEverscaleConfigurationAddress] = useState<Address | undefined>(undefined);
    const [evmConfigurationAddresses, setEvmConfigurationAddresses] = useState<Address[] | undefined>(undefined);
    const [tokenRoot, setTokenRoot] = useState<Address | undefined>(undefined);

    useEffect(
        function () {
            let stale = false;
            if (connectionStatus === EverWalletConnectionStatus.Ok && address !== undefined) {
                const contract = new rpc.Contract(TokenAbi.EvmTokenTransferProxy, new Address(address));
                contract.methods
                    .getDetails({answerId: 0})
                    .call()
                    .then(
                        ({
                            value0: {tonConfiguration, ethereumConfigurations, tokenRoot},
                            // value1: owner,
                            // value2: burnedCount,
                            value3: isPaused,
                        }) => {
                            if (!stale) {
                                setEverscaleConfigurationAddress(tonConfiguration);
                                setEvmConfigurationAddresses(ethereumConfigurations);
                                setTokenRoot(tokenRoot);
                                setIsPaused(isPaused);
                            }
                        },
                    );
            }
            return () => {
                stale = true;
                setEverscaleConfigurationAddress(undefined);
                setEvmConfigurationAddresses(undefined);
                setTokenRoot(undefined);
                setIsPaused(undefined);
            };
        },
        [connectionStatus, address],
    );

    const isDataLoaded =
        isPaused !== undefined &&
        everscaleConfigurationAddress !== undefined &&
        evmConfigurationAddresses !== undefined &&
        tokenRoot !== undefined;

    return isDataLoaded
        ? {
              isPaused,
              everscaleConfigurationAddress,
              evmConfigurationAddresses,
              tokenRoot,
          }
        : undefined;
}
