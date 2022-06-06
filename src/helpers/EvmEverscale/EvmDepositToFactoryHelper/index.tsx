import React, {useEffect, useState} from 'react';
import {useEvmWallet} from '@/providers/EvmWalletProvider';
import {TransferType} from '@/providers/BridgeStepProvider';
import {EthEventVoteData, NetworkShape} from '@/types';
import EvmWalletConnectHelper from '@/components/EvmWalletConnectHelper';
import EverWalletConnectHelper from '@/components/EverWalletConnectHelper';
import {EvmEverscalePipeline} from '@/helpers/EvmEverscale/evmEverscalePipeline';
import TransactionExplorerLink from '@/components/TransactionExplorerLink';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {decodeLogs} from 'abi-decoder';
import {mapEthBytesIntoTonCell} from 'eth-ton-abi-converter';
import BigNumber from 'bignumber.js';

export enum Status {
    Initializing,
    Waiting,
    InProgress,
    WaitingForConfirmations,
    Finished,
}

type EvmDepositHelperProps =
    // We need (amount and destinationAddress and minEversAmount and minTokensAmount) or (transactionHash)
    {
        transferType: TransferType.Credit;
        pipeline: EvmEverscalePipeline;
        network: NetworkShape;
        amount?: BigNumber;
        minEversAmount?: BigNumber;
        minTokensAmount?: BigNumber;
        destinationAddress?: string;
        transactionHash: string | undefined;
        destinationCreditor?: string;
        onTransactionHash: (hash: string) => void;
    };

// type EthEventVoteData ;
type EvmDepositHelperData = {
    component: JSX.Element;
    status: Status;
    depositEvent: EthEventVoteData | undefined;
};

export const useEvmDepositToFactoryHelper = (props: EvmDepositHelperProps): EvmDepositHelperData => {
    // This is just a helper, it is return current deposit status, tx hash and component button.
    const [depositStatus, setDepositStatus] = useState<Status>(Status.Initializing);
    const [depositEvent, setDepositEventData] = useState<EthEventVoteData | undefined>(undefined);

    const {library} = useEvmWallet();

    const {amount, minEversAmount, minTokensAmount, destinationAddress, pipeline, transactionHash} = props;

    // tricky deconstructing to avoid unnecessary useEffect usage
    const pipelineError = pipeline.isLoaded ? pipeline.error : undefined;
    const blocksToConfirm = pipeline.isLoaded ? pipeline.blocksToConfirm : 0;

    // This hook subscribed on isReady, props.transactionHash, props.blocksToConfirm and set valid depositStatus
    useEffect(
        function () {
            if (pipeline.isLoaded && !pipelineError) {
                if (transactionHash) {
                    setDepositStatus(Status.WaitingForConfirmations);
                    let stale = false;
                    const refreshTxStatus = () => {
                        library?.getTransaction(transactionHash).then(function (tx) {
                            if (tx.confirmations > blocksToConfirm) {
                                library?.getTransactionReceipt(transactionHash).then(function (txReceipt) {
                                    if (txReceipt.to.toLowerCase() !== pipeline.vaultAddress) {
                                        console.error(
                                            "Vault address doesn't match tx Receipt vaultAddress. Can happen if someone modify transfer url",
                                        );
                                        return;
                                    }
                                    if (!stale) {
                                        stale = true;
                                        clearInterval(interval);
                                        const decodedLogs = decodeLogs(txReceipt?.logs || []);
                                        const depositLog =
                                            txReceipt.logs[
                                                decodedLogs.findIndex(
                                                    (log: any) => log !== undefined && log.name === 'FactoryDeposit',
                                                )
                                            ];
                                        const eventData = mapEthBytesIntoTonCell(
                                            Buffer.from(pipeline.eventABI, 'base64').toString(),
                                            depositLog.data,
                                        );
                                        if (depositLog && eventData) {
                                            setDepositStatus(Status.Finished);
                                            setDepositEventData({
                                                eventBlock: txReceipt.blockHash,
                                                eventBlockNumber: txReceipt.blockNumber.toString(),
                                                eventTransaction: txReceipt.transactionHash,
                                                eventData: eventData,
                                                eventIndex: depositLog.logIndex.toString(),
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    };
                    refreshTxStatus();
                    const interval = setInterval(refreshTxStatus, 10000);

                    return () => {
                        stale = true;
                        clearInterval(interval);
                    };
                } else {
                    setDepositStatus(Status.Waiting);
                }
            } else {
                setDepositStatus(Status.Initializing);
            }
        },
        [pipeline.isLoaded, pipelineError, blocksToConfirm, transactionHash],
    );

    const component = (
        <div>
            <div className={'margin-top-bottom-10'}>
                {(() => {
                    switch (depositStatus) {
                        case Status.Initializing:
                            return (
                                <div>
                                    <span>Initializing</span>
                                    <br />
                                    <div className={'material-like-button margin-top-bottom-10 disabled'}>Transfer</div>
                                </div>
                            );
                        case Status.Waiting:
                            return (
                                <div>
                                    <span>Waiting for deposit:</span>
                                    <br />
                                    <div
                                        className={'material-like-button margin-top-bottom-10'}
                                        onClick={() => {
                                            if (
                                                props.transferType === TransferType.Credit &&
                                                pipeline.isLoaded &&
                                                amount &&
                                                minEversAmount &&
                                                minTokensAmount &&
                                                destinationAddress
                                            ) {
                                                pipeline
                                                    .depositToFactory(
                                                        amount,
                                                        minEversAmount,
                                                        minTokensAmount,
                                                        destinationAddress,
                                                    )
                                                    .once('transactionHash', (transactionHash: string) => {
                                                        props.onTransactionHash(transactionHash);
                                                    });
                                            }
                                        }}>
                                        Transfer
                                    </div>
                                </div>
                            );
                        case Status.WaitingForConfirmations:
                            return (
                                <div>
                                    Waiting for {blocksToConfirm} confirmations{' '}
                                    <TransactionExplorerLink
                                        hash={transactionHash || ''}
                                        explorerBaseUrl={props.network.explorerBaseUrl}
                                    />
                                </div>
                            );
                        case Status.Finished:
                            return (
                                <div>
                                    Confirmed!{' '}
                                    <TransactionExplorerLink
                                        hash={transactionHash || ''}
                                        explorerBaseUrl={props.network.explorerBaseUrl}
                                    />
                                </div>
                            );
                    }
                })()}
            </div>
            <div className={'margin-top-bottom-10'}>
                <EvmWalletConnectHelper network={props.network} />
            </div>
            <div className={'margin-top-bottom-10'}>
                <EverWalletConnectHelper />
            </div>
        </div>
    );

    return {status: depositStatus, depositEvent, component};
};
