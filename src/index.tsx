import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import init from 'eth-ton-abi-converter';

import './index.css';

(async () => {
    try {
        await init();
    } catch (e) {
        console.error('eth-ton-abi-converter initialization error', e);
    }
})();

ReactDOM.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
    document.getElementById('root'),
);
