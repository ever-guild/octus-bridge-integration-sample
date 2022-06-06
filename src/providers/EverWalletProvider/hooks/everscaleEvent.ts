import {Address, TransactionId} from 'everscale-inpage-provider';
import {useCallback, useEffect, useState} from 'react';
import {EverWalletConnectionStatus} from '@/types';
import {TokenAbi} from '@/misc/ever-abi';
import BigNumber from 'bignumber.js';
import {rpc, useEverWallet} from '@/providers/EverWalletProvider';
import {useAccountDeployStatus} from '@/providers/EverWalletProvider/hooks/account';

export enum EverscaleEventContractStatus {
    Initializing = '0',
    Pending = '1',
    Confirmed = '2',
    Rejected = '3',
}

export type EverscaleEventData = {
    eventTimestamp: string;
    eventTransactionLt: string;
    eventData: string;
    eventDataDecoded: {
        senderWid: string;
        senderAddressValue: string;
        tokens: string;
        destinationAddress: string;
        destinationChainId: string;
    };
    configurationWid: string;
    configurationAddressValue: string;
    eventContractWid: string;
    eventContractAddressValue: string;
    round: string;
};

export type EverscaleEventContractState =
    | {
          isDeployed: false | undefined;
      }
    | {
          isDeployed: true;
          status:
              | EverscaleEventContractStatus.Pending
              | EverscaleEventContractStatus.Rejected
              | EverscaleEventContractStatus.Initializing;
      }
    | {
          isDeployed: true;
          status: EverscaleEventContractStatus.Confirmed;
          close: () => Promise<TransactionId>;
          eventData: EverscaleEventData;
          rawSignatures: string[];
      };

export function useEverscaleEventContractState(address: string | undefined): EverscaleEventContractState {
    const [status, setStatus] = useState<EverscaleEventContractStatus | undefined>(undefined);
    const [rawSignatures, setRawSignatures] = useState<string[]>([]);
    const [eventData, setEventData] = useState<EverscaleEventData | undefined>(undefined);

    const {connectionStatus} = useEverWallet();
    const deployStatus = useAccountDeployStatus(address);

    // Subscribe to event and update state until it confirmed.
    useEffect(
        function () {
            if (connectionStatus === EverWalletConnectionStatus.Ok && address && deployStatus) {
                let stale = false;
                const eventContract = new rpc.Contract(TokenAbi.TokenTransferTonEvent, new Address(address));
                //TODO use subscription
                const update = async () => {
                    const eventDetails = await eventContract.methods.getDetails({answerId: 0}).call();
                    const signatures = eventDetails._signatures;

                    if (!stale) {
                        const _status = Object.entries(EverscaleEventContractStatus).find(
                            ([, value]) => value === eventDetails._status,
                        )?.[1];

                        if (
                            _status === EverscaleEventContractStatus.Confirmed ||
                            _status === EverscaleEventContractStatus.Rejected
                        ) {
                            clearInterval(interval);
                        }

                        if (_status === EverscaleEventContractStatus.Confirmed) {
                            // Prepare event data.
                            const round_number = (await eventContract.methods.round_number({}).call()).round_number;
                            const decodedEvent = await rpc.unpackFromCell({
                                allowPartial: true,
                                boc: eventDetails._eventInitData.voteData.eventData,
                                structure: [
                                    {name: 'wid', type: 'int8'},
                                    {name: 'addr', type: 'uint256'},
                                    {name: 'tokens', type: 'uint128'},
                                    {name: 'eth_addr', type: 'uint160'},
                                    {name: 'chainId', type: 'uint32'},
                                ] as const,
                            });

                            const _eventData: EverscaleEventData = {
                                eventTimestamp: eventDetails._eventInitData.voteData.eventTimestamp,
                                eventTransactionLt: eventDetails._eventInitData.voteData.eventTransactionLt,
                                eventData: eventDetails._eventInitData.voteData.eventData,
                                eventDataDecoded: {
                                    senderWid: decodedEvent.data.wid,
                                    senderAddressValue: decodedEvent.data.addr,
                                    tokens: decodedEvent.data.tokens, // количество токенов
                                    destinationAddress: decodedEvent.data.eth_addr, // кому
                                    destinationChainId: decodedEvent.data.chainId, // чейн айди
                                },
                                configurationWid: eventDetails._eventInitData.configuration.toString().split(':')[0],
                                configurationAddressValue: eventDetails._eventInitData.configuration
                                    .toString()
                                    .split(':')[1],
                                eventContractWid: address.split(':')[0],
                                eventContractAddressValue: address.split(':')[1],
                                round: round_number.toString(),
                            };
                            if (stale) return;
                            setEventData(_eventData);
                        }
                        setRawSignatures(signatures);
                        setStatus(_status);
                    }
                };
                update();
                const interval = setInterval(update, 10000);

                return () => {
                    stale = true;
                    clearInterval(interval);
                    setStatus(undefined);
                    setEventData(undefined);
                    setRawSignatures([]);
                };
            }
        },
        [connectionStatus, deployStatus, address],
    );

    const close = useCallback((): Promise<TransactionId> => {
        if (
            connectionStatus !== EverWalletConnectionStatus.Ok ||
            !address ||
            !eventData ||
            status !== EverscaleEventContractStatus.Confirmed
        ) {
            return Promise.reject('Event in wrong state');
        }
        const eventContract = new rpc.Contract(TokenAbi.TokenTransferTonEvent, new Address(address));
        return eventContract.methods
            .close({})
            .send({
                amount: '1000000000',
                bounce: true,
                from: new Address(
                    `${eventData.eventDataDecoded.senderWid}:${new BigNumber(
                        eventData.eventDataDecoded.senderAddressValue,
                    )
                        .toString(16)
                        .padStart(64, '0')}`,
                ),
            })
            .then(function (answer) {
                return answer.id;
            });
    }, [connectionStatus, status, eventData, address]);

    if (deployStatus === undefined) {
        return {
            isDeployed: undefined,
        };
    } else if (!deployStatus || status === undefined) {
        return {
            isDeployed: false,
        };
    } else if (
        status !== EverscaleEventContractStatus.Confirmed ||
        rawSignatures.length === 0 ||
        eventData === undefined
    ) {
        return {
            isDeployed: deployStatus,
            status: status !== EverscaleEventContractStatus.Confirmed ? status : EverscaleEventContractStatus.Pending,
        };
    } else {
        return {
            isDeployed: true,
            eventData,
            status,
            close,
            rawSignatures,
        };
    }
}
