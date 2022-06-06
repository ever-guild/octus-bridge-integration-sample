import React, {useEffect, useState} from 'react';
import {EverscaleEvmPipeline} from '@/helpers/EverscaleEvm/everscaleEvmPipeline';
import {useEvmWallet} from '@/providers/EvmWalletProvider';
import {EverscaleEventData} from '@/providers/EverWalletProvider/hooks/everscaleEvent';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import {decodeLogs} from 'abi-decoder';
import {useEncodedEvent, useWithdrawalReleaseStatus, useWithdrawId} from '@/providers/EvmWalletProvider/hooks/vault';

export enum Status {
    Initializing,
    Waiting,
    InProgress,
    Finished,
}

export enum ReleaseTxEvent {
    InstantWithdrawal,
    PendingWithdrawalCreated,
}

type EvmReleaseTransferHelperProps = {
    pipeline: EverscaleEvmPipeline;
    depositEventData: EverscaleEventData | undefined;
    rawSignatures: string[];
    releaseTxHash: string | undefined;
    onReleaseTxHash: (hash: string) => void;
    destinationNetworkId: string;
    depositEventAddress: string | undefined;
};

type EvmReleaseTransferHelperData = {
    component: JSX.Element;
    status: Status;
};

export const useEvmReleaseTransferHelper = ({
    pipeline,
    rawSignatures,
    depositEventData,
    depositEventAddress,
    destinationNetworkId,
    releaseTxHash,
    onReleaseTxHash,
}: EvmReleaseTransferHelperProps): EvmReleaseTransferHelperData => {
    const {library} = useEvmWallet();
    const [releaseStatus, setReleaseStatus] = useState<Status>(Status.Initializing);
    const [releaseActionInProgress, setReleaseActionInProgress] = useState<boolean>(false);

    const [releaseTxEvent, setReleaseTxEvent] = useState<ReleaseTxEvent | undefined>(undefined);

    const pipelineOk = pipeline.isLoaded && !pipeline.error;

    const encodedEvent: string | undefined = useEncodedEvent(
        depositEventData,
        pipelineOk ? pipeline.destinationChainId : undefined,
        pipelineOk ? pipeline.eventABI : undefined,
        pipelineOk ? pipeline.configurationEvmProxy : undefined,
    );

    const withdrawId: string | undefined = useWithdrawId(encodedEvent);

    const isReleased: boolean | undefined = useWithdrawalReleaseStatus(
        withdrawId,
        pipelineOk ? pipeline.vaultAddress : undefined,
        pipelineOk ? pipeline.destinationChainId : undefined,
    );

    // Fetch tx receipt or wait for them. Used to restore transfer state.
    useEffect(
        function () {
            if (pipelineOk && releaseTxHash) {
                let stale = false;
                const refreshTxStatus = () => {
                    library?.getTransactionReceipt(releaseTxHash).then(function (txReceipt) {
                        //waiting
                        if (!txReceipt) return;
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
                            const instantWithdrawal = decodedLogs.find((l: any) => l && l.name === 'InstantWithdrawal');
                            setReleaseTxEvent(
                                instantWithdrawal
                                    ? ReleaseTxEvent.InstantWithdrawal
                                    : ReleaseTxEvent.PendingWithdrawalCreated,
                            );
                        }
                    });
                };
                refreshTxStatus();
                const interval = setInterval(refreshTxStatus, 10000);
                return () => {
                    setReleaseTxEvent(undefined);
                    clearInterval(interval);
                };
            }
        },
        [releaseTxHash, pipelineOk, library],
    );

    useEffect(
        function () {
            if (withdrawId === undefined || isReleased === undefined) {
                setReleaseStatus(Status.Initializing);
            } else if (isReleased === false && !releaseTxHash) {
                setReleaseStatus(Status.Waiting);
            } else if (isReleased === false || releaseTxEvent === undefined) {
                setReleaseStatus(Status.InProgress);
            } else {
                setReleaseStatus(Status.Finished);
            }
        },
        [withdrawId, isReleased, releaseTxEvent, releaseTxHash],
    );

    const component = (
        <div>
            <div className={'margin-top-bottom-10'}>
                {(() => {
                    switch (releaseStatus) {
                        case Status.Initializing:
                            return (
                                <div>
                                    <span>
                                        {depositEventData === undefined ? 'Waiting for deposit' : 'Initializing'}
                                    </span>
                                    <br />
                                    <div className={'material-like-button margin-top-bottom-10 disabled'}>Release</div>
                                </div>
                            );
                        case Status.Waiting:
                        case Status.InProgress:
                            return (
                                <div>
                                    <span>{releaseTxHash ? 'Transaction in progress...' : 'Waiting for release:'}</span>
                                    <br />
                                    <div
                                        className={`material-like-button margin-top-bottom-10 ${
                                            releaseActionInProgress || releaseTxHash ? 'disabled' : ''
                                        }`}
                                        onClick={() => {
                                            if (
                                                pipeline.isLoaded &&
                                                depositEventData &&
                                                encodedEvent &&
                                                releaseActionInProgress === false &&
                                                releaseTxHash === undefined
                                            ) {
                                                setReleaseActionInProgress(true);
                                                pipeline
                                                    .saveWithdraw(encodedEvent, rawSignatures)
                                                    .once('transactionHash', (transactionHash: string) => {
                                                        setReleaseActionInProgress(false);
                                                        onReleaseTxHash(transactionHash);
                                                    })
                                                    .on('error', function () {
                                                        setReleaseActionInProgress(false);
                                                    });
                                            }
                                        }}>
                                        Release transfer
                                    </div>
                                </div>
                            );
                        case Status.Finished:
                            if (releaseTxEvent === ReleaseTxEvent.PendingWithdrawalCreated) {
                                return (
                                    <div>
                                        Your transfer putted in the queue, please use{' '}
                                        <a
                                            href={`https://app.octusbridge.io/transfer/everscale-1/${destinationNetworkId}/${depositEventAddress!}`}
                                            target={'_blank'}
                                            rel="noreferrer">
                                            Octus bridge fronted
                                        </a>{' '}
                                        to resolve.
                                    </div>
                                );
                            } else {
                                return <div>Released! Transfer successful</div>;
                            }
                    }
                })()}
            </div>
        </div>
    );

    return {status: releaseStatus, component};
};
