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
  var command_state = session.get('command_state')
  switch(command_state){
    case 'add_account':
      session.set('accounts', message.body);
      sendMessage(session, 'You added ' + message.body)
      break;
    case 'display_balance':
      sendMessage(session, session.get('accounts') || 'none')
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
      sendMessage(session, session.get('accounts') || 'none')
      sendMessage(session, session.get('accounts') || 'none')
      break
    }
}

function onPayment(session) {
  sendMessage(session, `Thanks for the payment! 🙏`)
}

function add_account_response(session){
  sendMessage(session, 'Please copy&paste your ethe address');
}

function display_balance_response(session){
  sendMessage(session, 'display_balance response');
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
