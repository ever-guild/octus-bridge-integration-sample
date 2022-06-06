import React from 'react';

type Props = {
    hash: string;
    explorerBaseUrl: string;
};

export default function TransactionExplorerLink(props: Props): JSX.Element {
    return (
        <a target={'_blank'} href={`${props.explorerBaseUrl}/tx/${props.hash}`} rel="noreferrer">{`${props.hash.slice(
            0,
            6,
        )}...${props.hash.slice(-6)}`}</a>
    );
}
