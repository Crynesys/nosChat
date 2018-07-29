const mongoose = require('mongoose');

const { Schema } = mongoose;

const TransactionSchema = new Schema({
    createTime: {
        type: Date, default: Date.now },
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User',
    },
    amount: String,
    asset: String,
    txid: String,
    neoAddress: String,
});

const Transaction = mongoose.model('Transaction', TransactionSchema);
module.exports = Transaction;
