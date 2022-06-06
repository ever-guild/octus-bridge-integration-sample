// Subscribe to account status
import {useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {Address} from 'everscale-inpage-provider';
import BigNumber from 'bignumber.js';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';

export const useAccountDeployStatus = (address: string | undefined): boolean | undefined => {
    const {connectionStatus} = useEverWallet();
    const [status, setStatus] = useState<boolean | undefined>(undefined);

    useEffect(
        function () {
            let stale = false;
            if (connectionStatus === EverWalletConnectionStatus.Ok && address) {
                rpc.subscribe('contractStateChanged', {
                    address: new Address(address),
                }).then((subscription) => {
                    let updatedViaSubscription = false;
                    rpc.getFullContractState({
                        address: new Address(address),
                    }).then(function (state) {
                        if (!updatedViaSubscription && !stale) {
                            setStatus(!!state.state?.isDeployed);
                        }
                        if (state.state?.isDeployed) {
                            subscription.unsubscribe();
                        }
                    });
                    subscription.on('data', (event) => {
                        updatedViaSubscription = true;
                        if (event.state.isDeployed) {
                            subscription.unsubscribe();
                        }
                        if (!stale) {
                            setStatus(event.state.isDeployed);
                        }
                    });
                });
            }
            return () => {
                stale = true;
                setStatus(undefined);
            };
        },
        [connectionStatus, address],
    );

    return status;
};

export const useAccountBalance = (address: string | undefined): BigNumber | undefined => {
    const {connectionStatus} = useEverWallet();
    const [balance, setBalance] = useState<BigNumber | undefined>(undefined);

    useEffect(
        function () {
            let stale = false;
            if (connectionStatus === EverWalletConnectionStatus.Ok && address) {
                rpc.subscribe('contractStateChanged', {
                    address: new Address(address),
                }).then((subscription) => {
                    let updatedViaSubscription = false;
                    rpc.getFullContractState({
                        address: new Address(address),
                    }).then(function (state) {
                        if (!updatedViaSubscription && !stale && state.state?.isDeployed) {
                            setBalance(new BigNumber(state.state.balance));
                        }
                    });
                    subscription.on('data', (event) => {
                        updatedViaSubscription = true;
                        if (!stale && event.state.isDeployed) {
                            setBalance(new BigNumber(event.state.balance));
                        }
                        if (stale) {
                            subscription.unsubscribe();
                        }
                    });
                });
            }
            return () => {
                stale = true;
                setBalance(undefined);
            };
        },
        [connectionStatus, address],
    );

    return balance;
};
