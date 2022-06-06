import React from 'react';
import './index.scss';

type InputProps = {
    value: string;
    label?: string;
    readonly: boolean;
    onChange: (newValue: string) => void;
};

export default function Input(props: InputProps): JSX.Element {
    const {value, label, readonly, onChange} = props;

    return (
        <div className={'simple-input-container'}>
            {label && <span className={'simple-input-label'}>{label}</span>}
            <input
                type={'text'}
                className={'simple-input'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readonly}
            />
        </div>
    );
}
