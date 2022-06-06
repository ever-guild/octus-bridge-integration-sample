import React from 'react';
import './App.css';
import {BrowserRouter as Router, Route, Switch} from 'react-router-dom';
import {EvmWalletProvider} from '@/providers/EvmWalletProvider';
import {EverWalletProvider} from './providers/EverWalletProvider';
import {BridgeProvider} from '@/providers/BridgeStepProvider';
import Bridge from './bridge';

function App() {
    return (
        <EvmWalletProvider>
            <EverWalletProvider>
                <BridgeProvider>
                    <Router>
                        <Switch>
                            <Route exact path={['/']}>
                                <Bridge />
                            </Route>
                            <Route
                                path={`/transfer/:fromNetworkId/:toNetworkId/:vaultAddress/:depositTxHashOrEventAddress/:transferTypeOrReleaseTxHash?`}>
                                <Bridge />
                            </Route>
                        </Switch>
                    </Router>
                </BridgeProvider>
            </EverWalletProvider>
        </EvmWalletProvider>
    );
}

export default App;
