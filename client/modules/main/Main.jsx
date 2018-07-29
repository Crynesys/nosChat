import React, { Component } from 'react';
import { immutableRenderDecorator } from 'react-immutable-render-mixin';
import injectSheet from 'react-jss';

import Sidebar from './sidebar/Sidebar';
import ChatPanel from './chatPanel/ChatPanel';
import './Main.less';
import * as ShowWalletInfo from './ShowWalletInfo';

@immutableRenderDecorator
class Main extends Component {

    render() {
        return (
            <div className="module-main">
                <Sidebar />
                <ChatPanel />
            </div>
        );
    }
}
/*

   render() {
        return (

                 <div className="module-main">
                    <ShowWalletInfo />
                </div>
            <div className="module-main">
                    <Sidebar />
                    <ChatPanel />
        </div>
        );
    }


*/
export default Main;
