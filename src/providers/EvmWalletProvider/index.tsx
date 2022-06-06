import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {UnsupportedChainIdError, useWeb3React, Web3ReactProvider} from '@web3-react/core';
import {GetProviderLibrary, injected} from '@/providers/EvmWalletProvider/connectors';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {addABI, keepNonDecodedLogs} from 'abi-decoder';
import {EthAbi} from '@/misc/eth-abi';
import {Web3Provider} from '@ethersproject/providers';
import {AbstractConnector} from '@web3-react/abstract-connector';
import Web3 from 'web3';
import {ChainId, EvmWalletConnectionStatus, NetworkShape} from '@/types';

export interface EvmWalletProviderProps {
    children: React.ReactNode;
}

export const EvmWalletProvider: React.FunctionComponent<EvmWalletProviderProps> = ({children}) => {
    // Add abi to be able to decode vault events
    addABI(EthAbi.Vault);
    keepNonDecodedLogs();
    return <Web3ReactProvider getLibrary={GetProviderLibrary}>{children}</Web3ReactProvider>;
};

export function useEagerConnect() {
    const {activate, active} = useWeb3React();

    const [tried, setTried] = useState(false);

    useEffect(() => {
        injected.isAuthorized().then((isAuthorized: boolean) => {
            if (isAuthorized) {
                activate(injected, undefined, true).catch(() => {
                    setTried(true);
                });
            } else {
                setTried(true);
            }
        });
    }, []);

    useEffect(() => {
        if (!tried && active) {
            setTried(true);
        }
    }, [tried, active]);

    return tried;
}

export function useInactiveListener(suppress = false) {
    const {active, error, activate} = useWeb3React();

    useEffect(() => {
        // eslint-disable-next-line
        const {ethereum} = window as any;
        if (ethereum && ethereum.on && !active && !error && !suppress) {
            const handleConnect = () => {
                console.log("Handling 'connect' event");
                activate(injected);
            };
            const handleChainChanged = (chainId: string | number) => {
                console.log("Handling 'chainChanged' event with payload", chainId);
                activate(injected);
            };
            const handleAccountsChanged = (accounts: string[]) => {
                console.log("Handling 'accountsChanged' event with payload", accounts);
                if (accounts.length > 0) {
                    activate(injected);
                }
            };
            const handleNetworkChanged = (networkId: string | number) => {
                console.log("Handling 'networkChanged' event with payload", networkId);
                activate(injected);
            };

            ethereum.on('connect', handleConnect);
            ethereum.on('chainChanged', handleChainChanged);
            ethereum.on('accountsChanged', handleAccountsChanged);
            ethereum.on('networkChanged', handleNetworkChanged);

            return () => {
                if (ethereum.removeListener) {
                    ethereum.removeListener('connect', handleConnect);
                    ethereum.removeListener('chainChanged', handleChainChanged);
                    ethereum.removeListener('accountsChanged', handleAccountsChanged);
                    ethereum.removeListener('networkChanged', handleNetworkChanged);
                }
            };
        }
    }, [active, error, suppress, activate]);
}

export const useEvmWallet = function () {
    const {connector, library, chainId, account, activate, deactivate, active, error} = useWeb3React<Web3Provider>();

    const [activatingConnector, setActivatingConnector] = React.useState<AbstractConnector>(); //Is activation in progress
    const [web3, setWeb3] = React.useState<Web3 | undefined>(undefined);

    // Set  activatingConnector to undefined after it successful loaded
    useEffect(() => {
        if (activatingConnector && activatingConnector === connector) {
            setActivatingConnector(undefined);
        }
    }, [activatingConnector, connector]);

    useEffect(() => {
        if (active && connector) {
            connector
                .getProvider()
                .then((provider) => {
                    setWeb3(new Web3(provider));
                })
                .catch(() => {
                    //TODO better error handling
                    setWeb3(undefined);
                });
        } else {
            setWeb3(undefined);
        }
    }, [active, connector]);

    const triedEager = useEagerConnect();
    useInactiveListener(!triedEager || !!activatingConnector);

    const activateConnector = useCallback(
        function () {
            setActivatingConnector(injected);
            activate(injected);
        },
        [activate],
    );

    const changeNetwork = useCallback(
        async function (network: NetworkShape) {
            const provider = await connector?.getProvider();
            if (provider) {
                provider
                    .request({
                        method: 'wallet_switchEthereumChain',
                        params: [{chainId: `0x${parseInt(network.chainId, 10).toString(16)}`}],
                    })
                    .catch((err: any) => {
                        if (err.code === 4902) {
                            provider.request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        blockExplorerUrls: [network.explorerBaseUrl],
                                        chainId: `0x${parseInt(network.chainId, 10).toString(16)}`,
                                        chainName: network.name,
                                        nativeCurrency: {
                                            decimals: 18,
                                            name: network.currencySymbol,
                                            symbol: network.currencySymbol,
                                        },
                                        rpcUrls: [network.rpcUrl],
                                    },
                                ],
                            });
                        }
                    });
            }
        },
        [connector],
    );

    const getMetamaskConnectionStatusForChainId = useMemo((): ((
        targetChainId: ChainId,
    ) => EvmWalletConnectionStatus) => {
        return function (targetChainId: ChainId): EvmWalletConnectionStatus {
            // eslint-disable-next-line
            const {ethereum} = window as any;
            if (!ethereum) {
                return EvmWalletConnectionStatus.NotInstalled;
            } else if (
                (active && chainId && chainId.toString() !== targetChainId) ||
                (error && error instanceof UnsupportedChainIdError)
            ) {
                return EvmWalletConnectionStatus.HasWrongNetwork;
            } else if (!active) {
                return EvmWalletConnectionStatus.NotConnected;
            } else {
                return EvmWalletConnectionStatus.Ok;
            }
        };
    }, [active, chainId, error]);

    return {
        active,
        web3,
        getMetamaskConnectionStatusForChainId,
        error,
        connector,
        library,
        chainId: chainId?.toString(),
        account: account || undefined,
        activatingConnector,
        activateConnector,
        changeNetwork,
        deactivate,
    };
};

// Pull block number
export const useBlockNumber = function (library: Web3Provider | undefined): number | undefined {
    const [blockNumber, setBlockNumber] = useState<number | undefined>();

    useEffect(() => {
        if (!library) {
            setBlockNumber(undefined);
        } else {
            let stale = false;
            library
                .getBlockNumber()
                .then((blockNumber: number) => {
                    setBlockNumber(blockNumber);
                })
                .catch(() => {
                    setBlockNumber(undefined);
                });

            const updateBlockNumber = (blockNumber: number) => {
                !stale && setBlockNumber(blockNumber);
            };
            library.on('block', updateBlockNumber);
            return () => {
                stale = true;
                library.removeListener('block', updateBlockNumber);
                setBlockNumber(undefined);
            };
        }
    }, [library]);

    return blockNumber;
};

// Check is the current network block number is higher than target.
// We use this hook to check is ethConfiguration is active
// Separate hook to prevent unnecessary re-renders
export const useBlockChecking = function (targetBlockNumber: number | undefined): boolean | undefined {
    const {library} = useEvmWallet();
    const [isHigher, setIsHigher] = useState<boolean | undefined>(undefined);

    useEffect(() => {
        if (!library || targetBlockNumber === undefined) {
            setIsHigher(undefined);
        } else {
            let stale = false;
            library
                .getBlockNumber()
                .then((blockNumber: number) => {
                    updateBlockNumber(blockNumber);
                })
                .catch(() => {
                    setIsHigher(undefined);
                });
            const updateBlockNumber = (blockNumber: number) => {
                !stale && setIsHigher(blockNumber >= targetBlockNumber);
            };
            library.on('block', updateBlockNumber);
            return () => {
                stale = true;
                library.removeListener('block', updateBlockNumber);
                setIsHigher(undefined);
            };
        }
    }, [library, targetBlockNumber]);

    return isHigher;
};
