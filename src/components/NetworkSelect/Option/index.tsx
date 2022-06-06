import React from 'react';

import './index.css';

type OptionProps = {
    text: string;
    icon: React.ReactElement;
};

export default function OptionSelect(props: OptionProps): JSX.Element {
    return (
        <div className={'network-select-option-container'}>
            <div className={'network-select-option'}>
                <span className={'network-select-option-icon'}>{props.icon}</span>
                <span className={'network-select-option-text'}>{props.text}</span>
            </div>
        </div>
    );
}
