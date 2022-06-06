import React, {useEffect, useState} from 'react';
import {EvmEverscalePipeline} from '@/helpers/EvmEverscale/evmEverscalePipeline';
import {EthEventVoteData} from '@/types';
import {EthEventContractStatus, useEthEventContractStatus} from '@/providers/EverWalletProvider/hooks/ethEvent';

export enum Status {
    Initializing,
    Waiting,
    InProgress,
    Finished,
}

type EverscaleReleaseTransferHelperProps = {
    pipeline: EvmEverscalePipeline;
    depositEventData: EthEventVoteData | undefined;
};

type EverscaleReleaseTransferHelperData = {
    component: JSX.Element;
    status: Status;
};

export const useEverscaleReleaseTransferHelper = (
    props: EverscaleReleaseTransferHelperProps,
): EverscaleReleaseTransferHelperData => {
    const [releaseStatus, setReleaseStatus] = useState<Status>(Status.Initializing);
    const [eventAddress, setEventAddress] = useState<string | undefined>(undefined);
    const [deployEventTxHash, setDeployEventTxHash] = useState<string | undefined>(undefined);
    const [deployActionInProgress, setDeployActionInProgress] = useState<boolean>(false);

    const {pipeline, depositEventData} = props;

    // tricky deconstructing to avoid unnecessary useEffect usage
    const pipelineError = pipeline.isLoaded ? pipeline.error : undefined;
    const ethEventContractStatus = useEthEventContractStatus(eventAddress);

    // When we get depositEventData we search in blockchain for already created TokenTransferEthereumEvent
    // or set status to Waiting to allow user to deploy a new one.
    useEffect(
        function () {
            if (pipeline.isLoaded && !pipelineError && depositEventData !== undefined) {
                pipeline.deriveEventAddress(depositEventData).then(function (address) {
                    setEventAddress(address);
                });
            } else {
                setReleaseStatus(Status.Initializing);
            }
        },
        [pipeline.isLoaded, pipelineError, depositEventData],
    );

    useEffect(
        function () {
            if (ethEventContractStatus.isDeployed === false && (deployEventTxHash || deployActionInProgress)) {
                setReleaseStatus(Status.InProgress);
            } else if (ethEventContractStatus.isDeployed === false && !deployEventTxHash && !deployActionInProgress) {
                setReleaseStatus(Status.Waiting);
            } else if (ethEventContractStatus.isDeployed === true) {
                setReleaseStatus(Status.Finished);
            } else if (ethEventContractStatus.isDeployed === undefined) {
                setReleaseStatus(Status.Initializing);
            }
        },
        [ethEventContractStatus.isDeployed, deployEventTxHash, deployActionInProgress],
    );

    const component = (
        <div>
            <div className={'margin-top-bottom-10'}>
                {(() => {
                    switch (releaseStatus) {
                        case Status.Initializing:
                        case Status.InProgress:
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
                            return (
                                <div>
                                    <span>Waiting for release:</span>
                                    <br />
                                    <div
                                        className={'material-like-button margin-top-bottom-10'}
                                        onClick={() => {
                                            if (
                                                pipeline.isLoaded &&
                                                depositEventData &&
                                                ethEventContractStatus.isDeployed === false
                                            ) {
                                                setDeployActionInProgress(true);
                                                pipeline
                                                    .deployEvent(depositEventData, pipeline.destinationAccount)
                                                    .then(function (answer) {
                                                        setDeployActionInProgress(false);
                                                        setDeployEventTxHash(answer.id.hash);
                                                    })
                                                    .catch((err) => {
                                                        console.error('deployEvent error', err);
                                                        setDeployActionInProgress(false);
                                                    });
                                            }
                                        }}>
                                        Release transfer
                                    </div>
                                </div>
                            );
                        case Status.Finished:
                            return (
                                <div>
                                    {(() => {
                                        switch (ethEventContractStatus.status) {
                                            case undefined:
                                                return <div>Waiting for contract deploying</div>;
                                            case EthEventContractStatus.Initializing:
                                                return <div>Contract deployed! Loading relayers list</div>;
                                            case EthEventContractStatus.Pending:
                                                return <div>Waiting for relayers confirms</div>;
                                            case EthEventContractStatus.Confirmed:
                                                return <div>Confirmed! Transfer successful</div>;
                                            case EthEventContractStatus.Rejected:
                                                return <div>Rejected! OoOops</div>;
                                        }
                                    })()}
                                </div>
                            );
                    }
                })()}
            </div>
        </div>
    );

    return {status: releaseStatus, component};
};
