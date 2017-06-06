const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat')
const account = '0x5a384227b65fa093dec03ec34e111db80a040615';
const Web3 = require('web3');
const url = 'https://mainnet.infura.io/V1LOapzeHsyDp8S1fcUF';
const provider = new Web3.providers.HttpProvider(url)
const web3 = new Web3(provider);
//
// function balanceOf(account){
//   return web3.eth.getBalance(account).toNumber()
// }

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
      onPayment(session)
      break
    case 'PaymentRequest':
      welcome(session)
      break
  }
}

function onMessage(session, message) {
  if (message.body == 'Reset') {
    session.set('command_state', null);
    session.set('accounts', []);
    sendMessage(session, 'The state has been reset');
  }
  var command_state = session.get('command_state')
  sendMessage(session, 'command state is ' + command_state)
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
      if (session.get('accounts').length == 0) {
        sendMessage(session, 'empty')
      }else{
        sendMessage(session, `have ${session.get('accounts')} accounts`)
        var _accounts = session.get('accounts')
        for (var i = 0; i < _accounts.length; i++) {
          sendMessage(session, _accounts[i])
        }
      }

      break
    }
}

function onPayment(session) {
  sendMessage(session, `Thanks for the payment! 🙏`)
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
