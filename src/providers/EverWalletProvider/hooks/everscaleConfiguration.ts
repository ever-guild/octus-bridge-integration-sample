import {Address, Contract} from 'everscale-inpage-provider';
import {TokenAbi} from '@/misc/ever-abi';
import {useCallback, useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import BigNumber from 'bignumber.js';
import {isGoodBignumber} from '@/utils';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';

export function useEverscaleConfigurationContract(
    address: Address | undefined,
): Contract<typeof TokenAbi.EverscaleEventConfiguration> | undefined {
    const {connectionStatus} = useEverWallet();
    const [contract, setContract] = useState<Contract<typeof TokenAbi.EverscaleEventConfiguration> | undefined>(
        undefined,
    );

    useEffect(
        function () {
            if (connectionStatus === EverWalletConnectionStatus.Ok && address) {
                setContract(new rpc.Contract(TokenAbi.EverscaleEventConfiguration, address));
            } else {
                setContract(undefined);
            }
        },
        [connectionStatus, address],
    );

    return contract;
}

type EverscaleConfigurationBasicConfiguration = {
    eventABI: string; // How to pack event to TVMCell
    staking: Address; // staking address
    eventInitialBalance: BigNumber; // How many evers must be sent to deployEvent
    eventCode: string;
};

type EverscaleConfigurationNetworkConfiguration = {
    eventEmitter: Address;
    proxy: string;
    startTimestamp: string;
    endTimestamp: string;
};

type EverscaleConfiguration = {
    basicConfiguration: EverscaleConfigurationBasicConfiguration;
    networkConfiguration: EverscaleConfigurationNetworkConfiguration;
    getLastTransactionLt: () => Promise<string | undefined>;
    getEventAddress: (fromLT: string, fromAddress: string, toAddress: string) => Promise<Address>;
};

export function useEverscaleConfiguration(address: Address | undefined): EverscaleConfiguration | undefined {
    const contract = useEverscaleConfigurationContract(address);

    const [basicConfiguration, setBasicConfiguration] = useState<EverscaleConfigurationBasicConfiguration | undefined>(
        undefined,
    );
    const [networkConfiguration, setNetworkConfiguration] = useState<
        EverscaleConfigurationNetworkConfiguration | undefined
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
                            _networkConfiguration: {eventEmitter, proxy, startTimestamp, endTimestamp},
                        }) => {
                            if (!stale && isGoodBignumber(eventInitialBalance)) {
                                setBasicConfiguration({
                                    eventABI: eventABI,
                                    staking: staking,
                                    eventInitialBalance: new BigNumber(eventInitialBalance),
                                    eventCode: eventCode,
                                });
                                setNetworkConfiguration({
                                    eventEmitter,
                                    proxy,
                                    startTimestamp,
                                    endTimestamp,
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

    // just fetch last transaction lt
    const getLastTransactionLt = useCallback(async (): Promise<string | undefined> => {
        if (address) {
            return (
                await rpc.getFullContractState({
                    address: address,
                })
            ).state?.lastTransactionId?.lt;
        } else {
            return undefined;
        }
    }, [address]);

    // after we send tokens burn request we subscribe to all deployEvent method calls from our
    // everscaleConfiguration and waiting for our method will be deployed.
    const getEventAddress = useCallback(
        async function (fromLT: string, fromAddress: string, toAddress: string): Promise<Address> {
            if (!address || !contract) throw new Error('Everscale configuration contract not initialized');

            const subscriber = new rpc.Subscriber();
            const oldStream = subscriber.oldTransactions(address, {
                fromLt: fromLT,
            });

            const eventStream = oldStream
                .merge(subscriber.transactions(address))
                .flatMap((item) => item.transactions)
                .filterMap(async (tx) => {
                    const decodedTx = await contract.decodeTransaction({
                        methods: ['deployEvent'],
                        transaction: tx,
                    });
                    if (decodedTx?.method === 'deployEvent' && decodedTx.input) {
                        const {eventData} = decodedTx.input.eventVoteData;
                        const event = await rpc.unpackFromCell({
                            allowPartial: true,
                            boc: eventData,
                            structure: [
                                {name: 'wid', type: 'int8'},
                                {name: 'addr', type: 'uint256'},
                                {name: 'tokens', type: 'uint128'},
                                {name: 'eth_addr', type: 'uint160'},
                                {name: 'chainId', type: 'uint32'},
                            ] as const,
                        });
                        const checkAddress = `${event.data.wid}:${new BigNumber(event.data.addr)
                            .toString(16)
                            .padStart(64, '0')}`;
                        const checkEvmAddress = `0x${new BigNumber(event.data.eth_addr)
                            .toString(16)
                            .padStart(40, '0')}`;

                        if (
                            checkAddress.toLowerCase() === fromAddress.toLowerCase() &&
                            checkEvmAddress.toLowerCase() === toAddress.toLowerCase()
                        ) {
                            const eventAddress = await contract.methods
                                .deriveEventAddress({
                                    answerId: 0,
                                    eventVoteData: decodedTx.input.eventVoteData,
                                })
                                .call();

                            return eventAddress.eventContract;
                        }
                        return undefined;
                    }
                    return undefined;
                });
            const eventAddress = await eventStream.first();

            return eventAddress;
        },
        [address, contract],
    );

    if (networkConfiguration && basicConfiguration) {
        return {
            networkConfiguration,
            basicConfiguration,
            getLastTransactionLt,
            getEventAddress,
        };
    }
    return undefined;
}
