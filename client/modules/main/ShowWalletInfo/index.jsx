import React from 'react';
import injectSheet from 'react-jss';
import PropTypes from 'prop-types';
import Message from '@/components/Message';
import { nosPropTypes } from '@nosplatform/api-functions/es6';


const styles = {
    button: {
        margin: '16px',
        fontSize: '14px',
    },
};

class ShowWalletInfo extends React.Component {
    state = {
        address: null,
        balance: null,
    };

    handleGetAddress = async () => this.props.nos.getAddress();

    handleClaimGas = () =>
        this.props.nos
            .claimGas()
            .then(alert)
            .catch(alert);

    handleGetBalance = async scriptHash => this.props.nos.getBalance(scriptHash);

    handleTestInvoke = async (scriptHash, operation, args) =>
        this.props.nos.testInvoke(scriptHash, operation, args);

    handleInvoke = async (scriptHash, operation, args) =>
        this.props.nos.testInvoke(scriptHash, operation, args);

    handleGetStorage = async (scriptHash, key) => this.props.nos.getStorage(scriptHash, key);
    /*

    const NEO = 'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';
    const address = 'AZPkgTJixxkSFPyBZrcVpLj9nsHsPDUVkF';

    // Example without the optional parameter
    nos.getBalance({ asset: NEO })
      .then((balance) => alert(`Balance: ${balance}`))
      .catch((err) => alert(`Error: ${err.message}`));

    // Example with the optional parameter
    nos.getBalance({ asset: NEO, address })
      .then((balance) => alert(`Balance: ${balance}`))
      .catch((err) => alert(`Error: ${err.message}`));

    */
    componentDidMount() {
        // this.props.nos = window.NOS.V1;
        const exists = !!window.NOS && !!window.NOS.V1;
        if (exists) {
            // window.hasOwnProperty('NOS')
            const nos = window.NOS.V1;
            const neo = 'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';

            let _balance = null;
            let _address = null;
            nos.getAddress()
                .then((address) => {
                    _address = address;
                    this.setState({ address, _balance });
                })
                .catch(err => alert(`Error: ${err.message}`));
            nos.getBalance({ asset: neo })
                .then((balance) => {
                    _balance = balance;
                    this.setState({ _address, balance });
                }).catch(err => alert(`Error: ${err.message}`));
        }
    }

    render() {
        // Get Balance
        const neo = 'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';
        const gas = '602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7';
        // const rpx = "ecc6b20d3ccac1ee9ef109af5a7cdb85706b1df9";

        return (
            <React.Fragment>

                <div>
                    <p>address: {this.state.address}</p>

                    <p>balance: {new Intl.NumberFormat('en-GB', { style: 'decimal' }).format(this.state.balance)} NEO</p>
                </div>

            </React.Fragment>
        );
    }
}

export default ShowWalletInfo;
