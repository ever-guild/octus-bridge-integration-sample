import React, {useEffect, useState} from 'react';
import {EvmEverscalePipeline} from '@/helpers/EvmEverscale/evmEverscalePipeline';
import {EthEventVoteData} from '@/types';
import {
    CreditProcessorContractStatus,
    useCreditProcessorContractStatus,
} from '@/providers/EverWalletProvider/hooks/creditProcessor';

export enum Status {
    Initializing,
    InProgress,
    Finished,
    Failed,
}

type EverscaleReleaseTransferHelperProps = {
    pipeline: EvmEverscalePipeline;
    txHash: string | undefined;
    sourceNetworkId: string;
    depositEventData: EthEventVoteData | undefined;
};

type EverscaleReleaseTransferHelperData = {
    component: JSX.Element;
    status: Status;
};

export const useEverscaleCreditProcessorStatusHelper = (
    props: EverscaleReleaseTransferHelperProps,
): EverscaleReleaseTransferHelperData => {
    const [releaseStatus, setReleaseStatus] = useState<Status>(Status.Initializing);
    const [creditProcessorAddress, setCreditProcessorAddress] = useState<string | undefined>(undefined);
    // const [deployActionInProgress, setDeployActionInProgress] = useState<boolean>(false);

    const {pipeline, depositEventData, sourceNetworkId, txHash} = props;

    // tricky deconstructing to avoid unnecessary useEffect usage
    const pipelineError = pipeline.isLoaded ? pipeline.error : undefined;
    const creditProcessorContractStatus = useCreditProcessorContractStatus(creditProcessorAddress);

    // When we get depositEventData we search in blockchain for already created TokenTransferEthereumEvent
    // or set status to Waiting to allow user to deploy a new one.
    useEffect(
        function () {
            if (pipeline.isLoaded && !pipelineError && depositEventData !== undefined) {
                pipeline.deriveCreditProcessorAddress(depositEventData).then(function (address) {
                    setCreditProcessorAddress(address);
                });
            }
        },
        [pipeline.isLoaded, pipelineError, depositEventData],
    );

    useEffect(
        function () {
            if (creditProcessorContractStatus.isDeployed) {
                if (
                    [
                        CreditProcessorContractStatus.Created,
                        CreditProcessorContractStatus.EventNotDeployed,
                        CreditProcessorContractStatus.EventDeployInProgress,
                        CreditProcessorContractStatus.EventConfirmed,
                        CreditProcessorContractStatus.CheckingAmount,
                        CreditProcessorContractStatus.CalculateSwap,
                        CreditProcessorContractStatus.SwapInProgress,
                        CreditProcessorContractStatus.UnwrapInProgress,
                    ].includes(creditProcessorContractStatus.status)
                ) {
                    setReleaseStatus(Status.InProgress);
                } else if (
                    [
                        CreditProcessorContractStatus.EventRejected,
                        CreditProcessorContractStatus.SwapFailed,
                        CreditProcessorContractStatus.SwapUnknown,
                        CreditProcessorContractStatus.UnwrapFailed,
                        CreditProcessorContractStatus.ProcessRequiresGas,
                        CreditProcessorContractStatus.Cancelled,
                    ].includes(creditProcessorContractStatus.status)
                ) {
                    setReleaseStatus(Status.Failed);
                } else if (creditProcessorContractStatus.status === CreditProcessorContractStatus.Processed) {
                    setReleaseStatus(Status.Finished);
                } else {
                    // never
                    setReleaseStatus(Status.Failed);
                }
            } else {
                setReleaseStatus(Status.Initializing);
            }
        },
        [creditProcessorContractStatus.isDeployed, creditProcessorContractStatus.status],
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
                                        {depositEventData === undefined
                                            ? 'Waiting for deposit'
                                            : 'Waiting for credit processor deployed'}
                                    </span>
                                    <br />
                                </div>
                            );
                        case Status.InProgress:
                            return (
                                <div>
                                    <span>
                                        {(() => {
                                            switch (creditProcessorContractStatus.status) {
                                                case CreditProcessorContractStatus.Created:
                                                case CreditProcessorContractStatus.EventNotDeployed:
                                                    return 'Credit processor initializing...';
                                                case CreditProcessorContractStatus.EventDeployInProgress:
                                                    return 'Event deployed, waiting for relays confirmations...';
                                                case CreditProcessorContractStatus.EventConfirmed:
                                                case CreditProcessorContractStatus.CheckingAmount:
                                                case CreditProcessorContractStatus.CalculateSwap:
                                                case CreditProcessorContractStatus.SwapInProgress:
                                                    return 'Swap in progress...';
                                                case CreditProcessorContractStatus.UnwrapInProgress:
                                                    return 'Unwrap in progress...';
                                                default:
                                                    return 'Unknown state';
                                            }
                                        })()}
                                    </span>
                                </div>
                            );
                        case Status.Finished:
                            return (
                                <div>
                                    <span>Confirmed! Transfer successful, tokens released!</span>
                                </div>
                            );
                        case Status.Failed:
                            return (
                                <div>
                                    {
                                        <span>
                                            Credit processor in bad state! Please use{' '}
                                            <a
                                                target={'_blank'}
                                                href={`https://app.octusbridge.io/transfer/${sourceNetworkId}/everscale-1/${txHash}/credit`}
                                                rel="noreferrer">
                                                Octus bridge frontend
                                            </a>{' '}
                                            to resolve
                                        </span>
                                    }
                                </div>
                            );
                    }
                })()}
            </div>
        </div>
    );

    return {status: releaseStatus, component};
};
