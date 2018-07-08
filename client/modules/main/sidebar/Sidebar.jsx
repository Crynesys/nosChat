/* eslint-disable */
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import autobind from 'autobind-decorator';
import { TwitterPicker } from 'react-color';
import * as qiniu from 'qiniu-js';
import { RadioGroup, RadioButton } from 'react-radio-buttons';
import Switch from 'react-switch';
import ReactLoading from 'react-loading';

import action from '@/state/action';
import socket from '@/socket';
import Avatar from '@/components/Avatar';
import IconButton from '@/components/IconButton';
import Dialog from '@/components/Dialog';
import Button from '@/components/Button';
import Message from '@/components/Message';
import OnlineStatus from './OnlineStatus';
import setCssVariable from '../../../../utils/setCssVariable';
import readDiskFile from '../../../../utils/readDiskFile';
import playSound from '../../../../utils/sound';
import config from '../../../../config/client';
import './Sidebar.less';
import ShowWalletInfo from '../ShowWalletInfo';


class Sidebar extends Component {
    static propTypes = {
        isLogin: PropTypes.bool.isRequired,
        isConnect: PropTypes.bool.isRequired,
        avatar: PropTypes.string,
        primaryColor: PropTypes.string,
        primaryTextColor: PropTypes.string,
        backgroundImage: PropTypes.string,
        userId: PropTypes.string,
        sound: PropTypes.string,
        soundSwitch: PropTypes.bool,
        notificationSwitch: PropTypes.bool,
        voiceSwitch: PropTypes.bool,
        showNosAddress: PropTypes.bool,
    }
    static logout() {
        action.logout();
        window.localStorage.removeItem('token');
        Message.success('Sei uscito');
        socket.disconnect();
        socket.connect();
    }
    static resetThume() {
        action.setPrimaryColor(config.primaryColor);
        action.setPrimaryTextColor(config.primaryTextColor);
        action.setBackgroundImage(config.backgroundImage);
        setCssVariable(config.primaryColor, config.primaryTextColor);
        window.localStorage.removeItem('primaryColor');
        window.localStorage.removeItem('primaryTextColor');
        window.localStorage.removeItem('backgroundImage');
        Message.success('Tema predefinito ripristinato');
    }
    static resetSound() {
        action.setSound(config.sound);
        window.localStorage.removeItem('sound');
        Message.success('Tono predefinito ripristinato');
    }
    static handleSelectSound(sound) {
        playSound(sound);
        action.setSound(sound);
    }
    constructor(...args) {
        super(...args);
        this.state = {
            settingDialog: false,
            userDialog: false,
            infoDialog: false,
            avatarLoading: false,
            backgroundLoading: false,
        };
    }
    @autobind
    openSettingDialog() {
        this.setState({
            settingDialog: true,
        });
    }
    @autobind
    closeSettingDialog() {
        this.setState({
            settingDialog: false,
        });
    }
    @autobind
    openUserDialog() {
        this.setState({
            userDialog: true,
        });
    }
    @autobind
    closeUserDialog() {
        this.setState({
            userDialog: false,
        });
    }
    @autobind
    openInfo() {
        this.setState({
            infoDialog: true,
        });
    }
    @autobind
    closeInfo() {
        this.setState({
            infoDialog: false,
        });
    }
    @autobind
    handlePrimaryColorChange(color) {
        const primaryColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        const { primaryTextColor } = this.props;
        action.setPrimaryColor(`${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`);
        setCssVariable(primaryColor, primaryTextColor);
    }
    @autobind
    handlePrimaryTextColorChange(color) {
        const primaryTextColor = `${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`;
        const { primaryColor } = this.props;
        action.setPrimaryTextColor(`${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}`);
        setCssVariable(primaryColor, primaryTextColor);
    }
    toggleAvatarLoading() {
        this.setState({
            avatarLoading: !this.state.avatarLoading,
        });
    }
    @autobind
    async selectAvatar() {
        const file = await readDiskFile('blob', 'image/png,image/jpeg,image/gif');
        if (file.length > config.maxImageSize) {
            return Message.error('Impossibile impostare l\'avatar, selezionare un\'immagine inferiore a 1 MB');
        }

        this.toggleAvatarLoading();
        socket.emit('uploadToken', {}, (tokenRes) => {
            if (typeof tokenRes === 'string') {
                Message.error(tokenRes);
            } else {
                const result = qiniu.upload(file.result, `Avatar/${this.props.userId}_${Date.now()}`, tokenRes.token, { useCdnDomain: true }, {});
                result.subscribe({
                    error: (err) => {
                        console.error(err);
                        Message.error('Impossibile caricare l\'immagine');
                        this.toggleAvatarLoading();
                    },
                    complete: (info) => {
                        const imageUrl = `${tokenRes.urlPrefix + info.key}`;
                        socket.emit('changeAvatar', { avatar: imageUrl }, (avatarRes) => {
                            if (typeof avatarRes === 'string') {
                                Message.error(avatarRes);
                                this.toggleAvatarLoading();
                            } else {
                                action.setAvatar(URL.createObjectURL(file.result));
                                Message.success('Avatar Modificato con successo');
                                this.toggleAvatarLoading();
                            }
                        });
                    },
                });
            }
        });
    }
    toggleBackgroundLoading() {
        this.setState({
            backgroundLoading: !this.state.backgroundLoading,
        });
    }
    @autobind
    async selectBackgroundImage() {
        this.toggleBackgroundLoading();
        const file = await readDiskFile('base64', 'image/png,image/jpeg,image/gif');
        if (file.length > config.maxBackgroundImageSize) {
            return Message.error('Impossibile impostare l\'immagine di sfondo.Seleziona un\'immagine di dimensioni inferiori a 3 MB.');
        }
        action.setBackgroundImage(file.result);
        this.toggleBackgroundLoading();
    }
    render() {
        const { isLogin, isConnect, avatar, primaryColor, primaryTextColor, backgroundImage, sound, soundSwitch, notificationSwitch, voiceSwitch, showNosAddress } = this.props;
        const { settingDialog, userDialog, infoDialog, avatarLoading, backgroundLoading } = this.state;
        const showNosData = window.hasOwnProperty('NOS');
        if (isLogin) {
            return (
                <div className="module-main-sidebar">
                    <Avatar className="avatar" src={avatar} onClick={this.openUserDialog} />
                    <OnlineStatus className="status" status={isConnect ? 'online' : 'offline'} />
                    <div className="buttons">

                        <IconButton width={40} height={40} icon="about" iconSize={26} onClick={this.openInfo} />
                        <IconButton width={40} height={40} icon="setting" iconSize={26} onClick={this.openSettingDialog} />
                        <IconButton width={40} height={40} icon="logout" iconSize={26} onClick={Sidebar.logout} />
                    </div>
                    <Dialog className="dialog system-setting" visible={settingDialog} title="Impostazioni di sistema" onClose={this.closeSettingDialog}>
                        <div className="content">
                            <div>
                                <p>Ripristina</p>
                                <div className="buttons">
                                    <Button onClick={Sidebar.resetThume}>Ripristina tema predefinito</Button>
                                    <Button onClick={Sidebar.resetSound}>Ripristina tono predefinito</Button>
                                </div>
                            </div>
                            <div>
                                <p>Imposta</p>
                                <div className="switch">
                                    <p>Visualizza l'indirizzo</p>
                                    <Switch
                                        onChange={action.setNosAddress}
                                        checked={showNosAddress}
                                    />
                                    <p>Promemoria sonoro</p>
                                    <Switch
                                        onChange={action.setSoundSwitch}
                                        checked={soundSwitch}
                                    />
                                    <p>Promemoria desktop</p>
                                    <Switch
                                        onChange={action.setNotificationSwitch}
                                        checked={notificationSwitch}
                                    />
                                    <p>Messaggio Vocale</p>
                                    <Switch
                                        onChange={action.setVoiceSwitch}
                                        checked={voiceSwitch}
                                    />
                                </div>
                            </div>
                            <div>
                                <p>Tono Rapido</p>
                                <div className="sounds">
                                    <RadioGroup value={sound} onChange={Sidebar.handleSelectSound} horizontal>
                                        <RadioButton value="default">Default</RadioButton>
                                        <RadioButton value="apple">Mela</RadioButton>
                                        <RadioButton value="pcqq">Computer</RadioButton>
                                        <RadioButton value="mobileqq">Mobile</RadioButton>
                                        <RadioButton value="momo">via via</RadioButton>
                                        <RadioButton value="huaji">Funny</RadioButton>
                                    </RadioGroup>
                                </div>
                            </div>
                            <div>
                                <p>Immagine di sfondo <span className="background-tip">L'immagine di sfondo verrà estesa alle dimensioni della finestra del browser, un rapporto ragionevole otterrà risultati migliori</span></p>
                                <div className="image-preview">
                                    <img className={backgroundLoading ? 'blur' : ''} src={backgroundImage} onClick={this.selectBackgroundImage} />
                                    <ReactLoading className={`loading ${backgroundLoading ? 'show' : 'hide'}`} type="spinningBubbles" color={`rgb(${primaryColor}`} height={100} width={100} />
                                </div>
                            </div>
                            <div>
                                <p>Colore del tema</p>
                                <div className="color-info">
                                    <div style={{ backgroundColor: `rgb(${primaryColor})` }} />
                                    <span>{`rgb(${primaryColor})`}</span>
                                </div>
                                <TwitterPicker className="color-picker" color={`rgb(${primaryColor})`} onChange={this.handlePrimaryColorChange} />
                            </div>
                            <div>
                                <p>Colore del testo</p>
                                <div className="color-info">
                                    <div style={{ backgroundColor: `rgb(${primaryTextColor})` }} />
                                    <span>{`rgb(${primaryTextColor})`}</span>
                                </div>
                                <TwitterPicker className="color-picker" color={`rgb(${primaryTextColor})`} onChange={this.handlePrimaryTextColorChange} />
                            </div>
                        </div>
                    </Dialog>
                    <Dialog className="dialog selfInfo" visible={userDialog} title="Impostazioni delle informazioni personali" onClose={this.closeUserDialog}>
                        <div className="content">
                            <div>
                                {showNosData && <ShowWalletInfo />}
                                <p>Avatar</p>
                                <div className="avatar-preview">
                                    <img className={avatarLoading ? 'blur' : ''} src={avatar} onClick={this.selectAvatar} />
                                    <ReactLoading className={`loading ${avatarLoading ? 'show' : 'hide'}`} type="spinningBubbles" color={`rgb(${primaryColor}`} height={80} width={80} />
                                </div>
                            </div>
                        </div>
                    </Dialog>
                    <Dialog className="dialog fiora-info " visible={infoDialog} title="info" onClose={this.closeInfo}>
                        <div className="content">
                            <div>
                                <p>piccola Chat per gestire gruppi con interessi comuni</p>
                            </div>
                            <div>
                                <p>Accedendo dal client di nOS è possibile sfruttare le operazioni messe a disposizione per inviare asset tra memebri della chat erichiamare smart contract NEO.</p>
                            </div>
                        </div>
                    </Dialog>
                </div>
            );
        }
        return (
            <div className="module-main-sidebar" />
        );
    }
}

export default connect(state => ({
    isLogin: !!state.getIn(['user', '_id']),
    isConnect: state.get('connect'),
    avatar: state.getIn(['user', 'avatar']),
    userId: state.getIn(['user', '_id']),
    primaryColor: state.getIn(['ui', 'primaryColor']),
    primaryTextColor: state.getIn(['ui', 'primaryTextColor']),
    backgroundImage: state.getIn(['ui', 'backgroundImage']),
    sound: state.getIn(['ui', 'sound']),
    soundSwitch: state.getIn(['ui', 'soundSwitch']),
    notificationSwitch: state.getIn(['ui', 'notificationSwitch']),
    voiceSwitch: state.getIn(['ui', 'voiceSwitch']),
    showNosAddress: state.getIn(['ui', 'showNosAddress']),
}))(Sidebar);
