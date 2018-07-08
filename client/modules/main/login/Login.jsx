/* eslint-disable */
import React, { Component } from 'react';
import autobind from 'autobind-decorator';
import platform from 'platform';

import socket from '@/socket';
import action from '@/state/action';
import { Tabs, TabPane, TabContent, ScrollableInkTabBar } from '@/components/Tabs';
import Input from '@/components/Input';
import Message from '@/components/Message';
import './Login.less';

class Login extends Component {
    @autobind
    handleLogin() {
        socket.emit('login', {
            username: this.username.getValue(),
            password: this.password.getValue(),
            os: platform.os.family,
            browser: platform.name,
            environment: platform.description,
        }, (res) => {
            if (typeof res === 'string') {
                Message.error(res);
            } else {
                action.setUser(res);
                action.closeLoginDialog();
                window.localStorage.setItem('token', res.token);
            }
        });
    }
    @autobind
    handleRegister() {
        let neoaddress = null;
        const loggedFromNos = !!window.NOS && !!window.NOS.V1;

        if (loggedFromNos) {
            window.NOS.V1.getAddress().then((address) => {
                neoaddress = address;
                socket.emit('register', {
                    username: this.username.getValue(),
                    password: this.password.getValue(),
                    neoAddress: neoaddress,
                    os: platform.os.family,
                    browser: platform.name,
                    environment: platform.description,
                }, (res) => {
                    if (typeof res === 'string') {
                        Message.error(res);
                    } else {
                        Message.success('Utente creato con successo');
                        action.setUser(res);
                        action.closeLoginDialog();
                        window.localStorage.setItem('token', res.token);
                    }
                });
            }).catch(err => alert(`Error: ${err.message}`));
        } else {
            socket.emit('register', {
                username: this.username.getValue(),
                password: this.password.getValue(),
                neoAddress: null,
                os: platform.os.family,
                browser: platform.name,
                environment: platform.description,
            }, (res) => {
                if (typeof res === 'string') {
                    Message.error(res);
                } else {
                    Message.success('Utente creato con successo');
                    action.setUser(res);
                    action.closeLoginDialog();
                    window.localStorage.setItem('token', res.token);
                }
            });
        }
    }
    renderLogin() {
        return (
            <div className="pane">
                <h3>Utente</h3>
                <Input ref={i => this.username = i} />
                <h3>Password</h3>
                <Input type="password" ref={i => this.password = i} />
                <button onClick={this.handleLogin}>Log in</button>
            </div>
        );
    }
    renderRegister() {
        return (
            <div className="pane">
                <h3>Utente</h3>
                <Input ref={i => this.username = i} />
                <h3>Password</h3>
                <Input type="password" ref={i => this.password = i} />
                <button onClick={this.handleRegister}>Registrati</button>
            </div>
        );
    }
    render() {
        return (
            <Tabs
                className="main-login"
                defaultActiveKey="login"
                renderTabBar={() => <ScrollableInkTabBar />}
                renderTabContent={() => <TabContent />}
            >
                <TabPane tab="Log in" key="login">
                    {this.renderLogin()}
                </TabPane>
                <TabPane tab="Log on" key="register">
                    {this.renderRegister()}
                </TabPane>
            </Tabs>
        );
    }
}

export default Login;
