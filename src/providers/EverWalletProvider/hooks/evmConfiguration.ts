import {Address, Contract, Transaction} from 'everscale-inpage-provider';
import {TokenAbi} from '@/misc/ever-abi';
import {useCallback, useEffect, useState} from 'react';
import {EthEventVoteData, EverWalletConnectionStatus} from '@/types';
import BigNumber from 'bignumber.js';
import {isGoodBignumber} from '@/utils';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';

export function useEvmConfigurationContract(
    address: string | undefined,
): Contract<typeof TokenAbi.EthEventConfig> | undefined {
    const {connectionStatus} = useEverWallet();
    const [contract, setContract] = useState<Contract<typeof TokenAbi.EthEventConfig> | undefined>(undefined);

    useEffect(
        function () {
            if (connectionStatus === EverWalletConnectionStatus.Ok && address !== undefined) {
                setContract(new rpc.Contract(TokenAbi.EthEventConfig, new Address(address)));
            } else {
                setContract(undefined);
            }
        },
        [connectionStatus, address],
    );
    return contract;
}

export type EthereumConfigurationBasicConfiguration = {
    eventABI: string; // How to pack event to TVMCell
    staking: Address; // staking address
    eventInitialBalance: BigNumber; // How many evers must be sent to deployEvent
    eventCode: string;
};

export type EthereumConfigurationNetworkConfiguration = {
    chainId: string;
    eventEmitter: string; // vault address
    eventBlocksToConfirm: number; // how many blocks we need to wait before event is confirmed
    proxy: Address; //Proxy who is print tokens
    startBlockNumber: number; //Block when event configuration is started
    endBlockNumber: number; // Block when event configurator is stopped (0 if unset)
};

export type EthereumConfigurationData = {
    address: Address;
    basicConfiguration: EthereumConfigurationBasicConfiguration;
    networkConfiguration: EthereumConfigurationNetworkConfiguration;
    deriveEventAddress: (eventVoteData: EthEventVoteData) => Promise<string>;
    deployEvent: (eventData: EthEventVoteData, fromAddress: string) => Promise<Transaction<Address>>;
};

export function useEvmConfiguration(address: string | undefined): EthereumConfigurationData | undefined {
    const contract = useEvmConfigurationContract(address);
    const [basicConfiguration, setBasicConfiguration] = useState<EthereumConfigurationBasicConfiguration | undefined>(
        undefined,
    );
    const [networkConfiguration, setNetworkConfiguration] = useState<
        EthereumConfigurationNetworkConfiguration | undefined
    >(undefined);

    useEffect(
        function () {
            let stale = false;
            if (contract) {
                contract.methods
                    .getDetails({answerId: 0})
                    .call()
                    .then(
                        ({
                            _basicConfiguration: {eventABI, staking, eventInitialBalance, eventCode},
                            _networkConfiguration: {
                                chainId,
                                eventEmitter,
                                eventBlocksToConfirm,
                                proxy,
                                startBlockNumber,
                                endBlockNumber,
                            },
                        }) => {
                            if (
                                !stale &&
                                isGoodBignumber(eventInitialBalance) &&
                                !isNaN(parseInt(eventBlocksToConfirm)) &&
                                !isNaN(parseInt(startBlockNumber)) &&
                                !isNaN(parseInt(endBlockNumber))
                            ) {
                                setBasicConfiguration({
                                    eventABI: eventABI,
                                    staking: staking,
                                    eventInitialBalance: new BigNumber(eventInitialBalance),
                                    eventCode: eventCode,
                                });
                                setNetworkConfiguration({
                                    chainId: chainId,
                                    eventEmitter: `0x${new BigNumber(eventEmitter).toString(16).padStart(40, '0')}`,
                                    eventBlocksToConfirm: parseInt(eventBlocksToConfirm),
                                    proxy: proxy,
                                    startBlockNumber: parseInt(startBlockNumber),
                                    endBlockNumber: parseInt(endBlockNumber),
                                });
                            }
                        },
                    );
            }
            return () => {
                stale = true;
                setNetworkConfiguration(undefined);
                setBasicConfiguration(undefined);
            };
        },
        [contract],
    );

    const deriveEventAddress = useCallback(
        function (eventVoteData: EthEventVoteData): Promise<string> {
            if (contract) {
                return new Promise<string>((resolve, reject) => {
                    contract.methods
                        .deriveEventAddress({
                            answerId: 0,
                            eventVoteData,
                        })
                        .call()
                        .then((answer) => {
                            resolve(answer.eventContract.toString());
                        })
                        .catch(reject);
                });
            } else {
                return Promise.reject(new Error('Wallet not connected'));
            }
        },
        [contract],
    );

    const deployEvent = useCallback(
        (eventVoteData: EthEventVoteData, fromAddress: string) => {
            if (basicConfiguration && contract) {
                return contract.methods.deployEvent({eventVoteData}).send({
                    amount: basicConfiguration.eventInitialBalance.toFixed(),
                    bounce: true,
                    from: new Address(fromAddress),
                });
            } else {
                return Promise.reject('Evm configuration not initialized');
            }
        },
        [contract, basicConfiguration],
    );

    if (basicConfiguration !== undefined && networkConfiguration !== undefined && address !== undefined) {
        return {
            basicConfiguration,
            networkConfiguration,
            address: new Address(address),
            deriveEventAddress,
            deployEvent,
        };
    }

    return undefined;
}
