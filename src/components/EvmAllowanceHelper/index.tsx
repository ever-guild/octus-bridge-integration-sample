import React, {useEffect, useState} from 'react';

import './index.css';
import BigNumber from 'bignumber.js';

type ComponentProps = {
    amount: BigNumber;
    forAddress: string;
    transactionType: string;
    requestApprove: (address: string, nanoTokens: BigNumber, transactionType: string) => Promise<any>;
};

export default function EvmAllowanceHelper(props: ComponentProps): JSX.Element {
    const [approveInProgress, setApproveInProgress] = useState<boolean>(false);

    // funny animation
    const [dotsCount, setDotsCount] = useState<number>(1);
    useEffect(() => {
        const interval = setInterval(() => {
            setDotsCount((prevState) => (prevState % 3) + 1);
        }, 1000);
        return () => {
            clearInterval(interval);
        };
    }, []);

    return (
        <div className={'evm-allowance-helper-container'}>
            {approveInProgress ? (
                <div>Tx in progress{dotsCount === 3 ? '...' : dotsCount === 2 ? '..' : '.'}</div>
            ) : (
                <div
                    className={'material-like-button'}
                    onClick={() => {
                        if (approveInProgress) return;
                        setApproveInProgress(true);
                        props
                            .requestApprove(props.forAddress, props.amount, props.transactionType)
                            .then(() => {
                                // There we can call callback or navigate user further, but we will just wait until
                                // allowance will update by setTimeout in useErc20TokenContractForAddress
                                // An Allow spending button will change by Next button.
                                console.log('Approval success');
                            })
                            .catch((err: any) => {
                                console.log('Approval error', err);
                                setApproveInProgress(false);
                            });
                    }}>
                    Allow spending
                </div>
            )}
        </div>
    );
}
