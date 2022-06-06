import React, {useState} from 'react';
import BigNumber from 'bignumber.js';
import {useAccountBalance} from '@/providers/EverWalletProvider/hooks/account';
import {
    EverscaleEventContractStatus,
    useEverscaleEventContractState,
} from '@/providers/EverWalletProvider/hooks/everscaleEvent';

type EverscaleEventCloseHelperProps = {
    eventAddress: string;
};

export const EverscaleEventCloseHelper = ({eventAddress}: EverscaleEventCloseHelperProps): JSX.Element => {
    // tricky deconstructing to avoid unnecessary useEffect usage

    const [txInProgress, setTxInProgress] = useState<boolean>(false);
    const accountBalance = useAccountBalance(eventAddress);
    const eventContract = useEverscaleEventContractState(eventAddress);

    return (
        <div className={'margin-top-bottom-10'}>
            {accountBalance &&
                accountBalance.gt(new BigNumber('100000000')) &&
                eventContract.isDeployed &&
                eventContract.status === EverscaleEventContractStatus.Confirmed && (
                    <div
                        className={`material-like-button margin-top-bottom-10 ${txInProgress ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!txInProgress) {
                                setTxInProgress(true);
                                eventContract.close().catch(function (err) {
                                    console.log(err);
                                    setTxInProgress(false);
                                });
                            }
                        }}>
                        Close event to get cashback
                    </div>
                )}
        </div>
    );
};
