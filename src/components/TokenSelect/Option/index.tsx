import React from 'react';

import './index.css';

type OptionProps = {
    text: string;
    icon: React.ReactElement;
};

export default function OptionSelect(props: OptionProps): JSX.Element {
    return (
        <div className={'token-select-option-container'}>
            <div className={'token-select-option'}>
                <span className={'token-select-option-icon'}>{props.icon}</span>
                <span className={'token-select-option-text'}>{props.text}</span>
            </div>
        </div>
    );
}
