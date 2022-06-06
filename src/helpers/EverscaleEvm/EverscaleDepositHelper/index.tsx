import React, {useState} from 'react';
import {TransferType} from '@/providers/BridgeStepProvider';
import {NetworkShape} from '@/types';
import EvmWalletConnectHelper from '@/components/EvmWalletConnectHelper';
import EverWalletConnectHelper from '@/components/EverWalletConnectHelper';
import BigNumber from 'bignumber.js';
import {EverscaleEvmPipeline} from '@/helpers/EverscaleEvm/everscaleEvmPipeline';
import {Address} from 'everscale-inpage-provider';
import {
    EverscaleEventContractStatus,
    EverscaleEventData,
    useEverscaleEventContractState,
} from '@/providers/EverWalletProvider/hooks/everscaleEvent';

export enum Status {
    Initializing,
    WaitingForDeploy,
    WaitingForConfirmations,
    Finished,
    Failed,
}

type EverscaleDepositHelperProps =
    // We need (amount and destinationAddress) or (eventAddress)
    {
        transferType: TransferType.Default;
        pipeline: EverscaleEvmPipeline;
        destinationNetwork: NetworkShape;
        amount?: BigNumber;
        destinationAddress?: string;
        eventAddress?: string | undefined;
        onEventAddress: (address: string) => void;
    };

type EverscaleDepositHelperData = {
    component: JSX.Element;
    depositEventData: EverscaleEventData | undefined;
    rawSignatures: string[];
};

export const useEverscaleDepositHelper = (props: EverscaleDepositHelperProps): EverscaleDepositHelperData => {
    const {amount, destinationAddress, pipeline, eventAddress, onEventAddress} = props;
    const [depositInProgress, setDepositInProgress] = useState(false);

    // tricky deconstructing to avoid unnecessary useEffect usage
    const eventContract = useEverscaleEventContractState(eventAddress);

    let depositStatus = Status.Initializing;
    if (pipeline.isLoaded && !pipeline.error) {
        if (eventAddress) {
            if (eventContract.isDeployed && eventContract.status === EverscaleEventContractStatus.Confirmed) {
                if (
                    `${eventContract.eventData.configurationWid}:${eventContract.eventData.configurationAddressValue}` ===
                        pipeline.configurationAddress.toString() &&
                    eventContract.eventData.eventDataDecoded.destinationChainId === pipeline.destinationChainId
                ) {
                    depositStatus = Status.Finished;
                } else {
                    // This can happen if someone will modify browser url transfer/everscale-1/evm-56/:vaultAddress/:eventAddress/default
                    // And set bad :vaultAddress and then refresh the page.
                    console.error('Vault mismatch in bridge state and event state');
                }
            } else if (eventContract.isDeployed && eventContract.status === EverscaleEventContractStatus.Rejected) {
                depositStatus = Status.Failed;
            } else {
                depositStatus = Status.WaitingForConfirmations;
            }
        } else {
            depositStatus = Status.WaitingForDeploy;
        }
    }

    const component = (
        <div>
            <div className={'margin-top-bottom-10'}>
                {(() => {
                    switch (depositStatus) {
                        case Status.Initializing:
                            return (
                                <div>
                                    <span> {!pipeline.isLoaded ? 'Initializing' : pipeline.error}</span>
                                    <br />
                                    <div className={'material-like-button margin-top-bottom-10 disabled'}>Transfer</div>
                                </div>
                            );
                        case Status.WaitingForDeploy:
                            return (
                                <div>
                                    <span>
                                        {depositInProgress
                                            ? 'Deposit in progress, waiting for event deploying, please do not leave this page'
                                            : 'Waiting for deposit:'}
                                    </span>
                                    <br />
                                    <div
                                        className={`material-like-button margin-top-bottom-10 ${
                                            depositInProgress ? 'disabled' : ''
                                        }`}
                                        onClick={() => {
                                            if (
                                                pipeline.isLoaded &&
                                                !pipeline.error &&
                                                amount &&
                                                destinationAddress &&
                                                !depositInProgress
                                            ) {
                                                setDepositInProgress(true);
                                                pipeline
                                                    .depositToBridge(amount.toFixed(), destinationAddress)
                                                    .then((eventAddress: Address) => {
                                                        onEventAddress(eventAddress.toString());
                                                        setDepositInProgress(false);
                                                    })
                                                    .catch((err) => {
                                                        console.log(err);
                                                        setDepositInProgress(false);
                                                    });
                                            }
                                        }}>
                                        Transfer
                                    </div>
                                </div>
                            );
                        case Status.WaitingForConfirmations:
                            return <div>Event deployed. Waiting for relays confirmations!</div>;
                        case Status.Finished:
                            return <div>Confirmed!</div>;
                        case Status.Failed:
                            return <div>Relays rejected you transfer!</div>;
                    }
                })()}
            </div>
            <div className={'margin-top-bottom-10'}>
                <EvmWalletConnectHelper network={props.destinationNetwork} />
            </div>
            <div className={'margin-top-bottom-10'}>
                <EverWalletConnectHelper />
            </div>
        </div>
    );

    if (eventContract.isDeployed && eventContract.status === EverscaleEventContractStatus.Confirmed) {
        return {
            depositEventData: eventContract.eventData,
            rawSignatures: eventContract.rawSignatures,
            component,
        };
    }

    return {
        depositEventData: undefined,
        rawSignatures: [],
        component,
    };
};
