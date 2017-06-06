const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat')
const account = '0x5a384227b65fa093dec03ec34e111db80a040615';
const Web3 = require('web3');
const url = 'https://mainnet.infura.io/V1LOapzeHsyDp8S1fcUF';
const provider = new Web3.providers.HttpProvider(url);
const web3 = new Web3(provider);
const numeral = require('numeral');

let bot = new Bot()

// ROUTING

bot.onEvent = function(session, message) {
  switch (message.type) {
    case 'Init':
      session.set('accounts', []);
      welcome(session)
      console.log('***balance');
      break
    case 'Message':
      onMessage(session, message)
      break
    case 'Command':
      onCommand(session, message)
      break
    case 'Payment':
      onPayment(session, message)
      break
    case 'PaymentRequest':
      welcome(session)
      break
  }
}

function onMessage(session, message) {
  if (message.body == 'Reset') {
    session.reset()
    sendMessage(session, 'The state has been reset');
  }
  var command_state = session.get('command_state')
  // sendMessage(session, 'command state is ' + command_state)
  switch(command_state){
    case 'add_account':
      var accounts = session.get('accounts') || [];
      accounts.push(message.body);
      session.set('accounts', accounts);
      sendMessage(session, 'You added ' + [message.body])
      break;
    default:
      welcome(session);
      break;
  }
}

function onCommand(session, command) {
  session.set('command_state', command.content.value);
  switch (command.content.value) {
    case 'add_account':
      add_account_response(session)
      break
    case 'display_balance':
      if (session.get('accounts') == null || session.get('accounts').length == 0) {
        sendMessage(session, 'No accounts have been added yet');
      }else{
        // sendMessage(session, `have ${session.get('accounts')} accounts`)
        var _accounts = session.get('accounts')
        var total = 0;
        for (var i = 0; i < _accounts.length; i++) {
          var account = _accounts[i];
          var balance = web3.eth.getBalance(account).toNumber();
          total+= balance;
          balance = web3.fromWei(balance, 'ether');
          balance = numeral(balance).format('0,0.000');
          sendMessage(session, `${account.slice(0,7)}... has ${balance} ether`)
        }
        total = web3.fromWei(total, 'ether');
        total = numeral(total).format('0,0.000');
        sendMessage(session, `The total balance is ${total} ether`)
      }
      break
    }
}

function onPayment(session, message) {
  if (message.fromAddress == session.config.paymentAddress) {
    // handle payments sent by the bot
    if (message.status == 'confirmed') {
      // perform special action once the payment has been confirmed
      // on the network
    } else if (message.status == 'error') {
      // oops, something went wrong with a payment we tried to send!
    }
  } else {
    // handle payments sent to the bot
    if (message.status == 'unconfirmed') {
      // payment has been sent to the ethereum network, but is not yet confirmed
      sendMessage(session, `Thanks for the payment! 🙏`);
    } else if (message.status == 'confirmed') {
      // handle when the payment is actually confirmed!
    } else if (message.status == 'error') {
      sendMessage(session, `There was an error with your payment!🚫`);
    }
  }
}

function add_account_response(session){
  sendMessageWithoutControl(session, 'Please copy&paste your ethe address below');
}

function eth(session){
  let balance = web3.eth.getBalance(account).toNumber();
  sendMessage(session, 'hello eth' + balance);
}

// STATES

function welcome(session) {
  sendMessage(session, `Welcome to balance!`)
}

// example of how to store state on each user
function count(session) {
  let count = (session.get('count') || 0) + 1
  session.set('count', count)
  sendMessage(session, `${count}`)
}

function donate(session) {
  // request $1 USD at current exchange rates
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.USD(1))
  })
}

// HELPERS

function sendMessageWithoutControl(session, message) {
  let controls = [
    {type: 'button', label: 'Add Account', value: 'add_account'},
    {type: 'button', label: 'Display Balance', value: 'display_balance'}
  ]
  session.reply(SOFA.Message({
    body: message,
    showKeyboard: false,
  }))
}


function sendMessage(session, message) {
  let controls = [
    {type: 'button', label: 'Add Account', value: 'add_account'},
    {type: 'button', label: 'Display Balance', value: 'display_balance'}
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}
