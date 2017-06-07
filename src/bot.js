const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat');
const account = '0x5a384227b65fa093dec03ec34e111db80a040615';
const Web3 = require('web3');
const url = 'https://mainnet.infura.io/V1LOapzeHsyDp8S1fcUF';
const provider = new Web3.providers.HttpProvider(url);
const web3 = new Web3(provider);
const numeral = require('numeral');
const block_interval = 15;
global.fetch = require('node-fetch');
const cc = require('cryptocompare');
const moment = require('moment');

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
  console.log('onCommand', command.content.value)
  session.set('command_state', command.content.value);
  var commands = command.content.value.split(' ');
  var command = commands[0]
  console.log('command', command)
  var arg = commands[1]
  switch (command) {
    case 'reset_accounts':
      session.reset();
      sendMessage(session, 'The accounts are all removed');
      break
    case 'add_account':
      add_account_response(session)
      break
    case 'display_balance':
      if (session.get('accounts') == null || session.get('accounts').length == 0) {
        sendMessage(session, 'No accounts have been added yet');
      }else{
        var date = new Date(new Date() - (arg * 1000 ) )
        console.log('Date', date)
        var current_block = web3.eth.blockNumber;
        var block = current_block - ( arg / block_interval);
        console.log(current_block, block);
        var formatted_date = moment(date).utc().format('MMMM Do YYYY, h:mm:ss a');
        sendMessage(session, `Your balance for ${formatted_date} UTC (block ${block})`);

        // sendMessage(session, `have ${session.get('accounts')} accounts`)
        var _accounts = session.get('accounts')
        var total = 0;
        for (var i = 0; i < _accounts.length; i++) {
          var account = _accounts[i];
          var balance = web3.eth.getBalance(account, block).toNumber();
          total+= balance;
          balance = web3.fromWei(balance, 'ether');
          balance = numeral(balance).format('0,0.000');
          sendMessage(session, `${account.slice(0,7)}... has ETH ${balance}`)
        }

        cc.priceHistorical('ETH', ['USD'], date)
        .then(prices => {
          var unit_price = prices['USD'];
          total = web3.fromWei(total, 'ether');
          var usd = numeral(total * unit_price).format('0,0.000');
          total = numeral(total).format('0,0.000');
          sendMessage(session, `The total balance is ETH ${total} ($${usd}, 1ETH = ${unit_price}USD)`)
        })
        .catch(console.error)
      }
      break
    }
}

function add_account_response(session){
  sendMessage(session, 'Please copy&paste your ether address below');
}

function welcome(session) {
  sendMessage(session, `Welcome to TokenBalances.  `)
}

function donate(session) {
  // request $1 USD at current exchange rates
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.USD(1))
  })
}

// HELPERS
const yesterday = 1 * 60 * 60 * 24;
const month_ago = yesterday * 30;
const year_ago = yesterday * 365;
function sendMessage(session, message) {
  let controls = [
    {
      type: "group",
      label: "Manage Accounts",
      controls: [
        {type: "button", label: "Add Account", value: `add_account`},
        {type: "button", label: "Reset Accounts", value: `reset_accounts`},
      ]
    },
    {
      type: "group",
      label: "Display Balance",
      controls: [
        {type: "button", label: "Now", value: `display_balance ${0}`},
        {type: "button", label: "Yesterday", value: `display_balance ${yesterday}`},
        {type: "button", label: "1 month ago", value: `display_balance ${month_ago}`},
        {type: "button", label: "1 year ago", value: `display_balance ${year_ago}`},
        {type: "button", label: "2 years ago", value: `display_balance ${year_ago * 1.5}`}
      ]
    }
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}
