const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat');
const account = '0x5a384227b65fa093dec03ec34e111db80a040615';
const Web3 = require('web3');
const url = 'https://mainnet.infura.io/NEefAs8cNxYfiJsYCQjc';
const provider = new Web3.providers.HttpProvider(url);
const web3 = new Web3(provider);
const abi = require('human-standard-token-abi');
const numeral = require('numeral');
const block_interval = 15;
global.fetch = require('node-fetch');
const cc = require('cryptocompare');
const moment = require('moment');
const Token = web3.eth.contract(abi)

let bot = new Bot()

// ROUTING
bot.onEvent = function(session, message) {
  switch (message.type) {
    case 'Init':
      session.set('accounts', []);
      welcome(session)
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

function onMessage(session, message) {
  if (message.body == 'Reset') {
    session.reset();
    session.set('accounts', []);
    sendMessage(session, 'The state has been reset');
  }
  var command_state = session.get('command_state')
  switch(command_state){
    case 'add_accounts':
      var list_of_account = message.body.split(/\n/);
      var account = message.body
      var accounts = session.get('accounts') || [];
      list_of_account.forEach(function(account){
        if (accounts.indexOf(account) == -1) {
          accounts.push(account);
          session.set('accounts', accounts);
          sendMessage(session, `${account} is added in the list`);
        }else{
          sendMessage(session, `${account} is already in the list`);
        }
      })
      break;
    default:
      welcome(session);
      break;
  }
}

function onCommand(session, command) {
  session.set('command_state', command.content.value);
  var commands = command.content.value.split(' ');
  var command = commands[0]
  var arg = commands[1]
  switch (command) {
    case 'list_accounts':
      var _accounts = session.get('accounts');
      if (_accounts == null || _accounts.length == 0) {
        sendMessage(session, 'No accounts are on the list');
      }else{
        for (var i = 0; i < _accounts.length; i++) {
          sendMessage(session, _accounts[i]);
        }
      }
      break
    case 'reset_accounts':
      session.reset();
      session.set('accounts', []);
      sendMessage(session, 'The accounts are all removed');
      break
    case 'add_accounts':
      add_accounts_response(session)
      break
    case 'track_token':
      console.log('*** track_token', arg)
      session.set('token_address', arg);
      sendMessage(session, 'You are now tracking Augur');
      break
    case 'display_balance':
      var date;
      if (session.get('accounts') == null || session.get('accounts').length == 0) {
        sendMessage(session, 'No accounts have been added yet');
      }else{
        if (arg == -1) {
          // The day one of Vitalik's account () had its first 0.2 Ether
          // https://etherscan.io/tx/0x13ae555f06f0ed867514eade329fa7bd439fa568855c0de8939557a949b4de30
          var block = 207971;
          date = new Date(web3.eth.getBlock(block).timestamp * 1000);
        }else{
          date = new Date(new Date() - (arg * 1000 ) )
          var block = web3.eth.blockNumber - ( arg / block_interval);
        }
          var formatted_date = moment(date).utc().format('MMMM Do YYYY, h:mm:ss a');
        sendMessage(session, `Your balance for ${formatted_date} UTC (block ${block})`);
        var eth_usd, rep_eth;
        var _accounts = session.get('accounts');
        var total = 0;

        cc.priceHistorical('ETH', ['USD'], date)
        .then(prices => {
          eth_usd = prices['USD'];
          return cc.priceHistorical('REP', ['ETH'], date)
        })
        .then(prices => {
          rep_eth = prices['ETH'];
          console.log("UNIT PRICES", eth_usd, rep_eth);
          for (var i = 0; i < _accounts.length; i++) {
            var account = _accounts[i];
            // track ether
            var balance = web3.eth.getBalance(account, block).toNumber();
            total+= balance;
            balance = web3.fromWei(balance, 'ether');
            balance = numeral(balance).format('0.00a');
            sendMessage(session, `${account.slice(0,7)}... has ETH ${balance}`)

            // track token
            var token_address = session.get('token_address');
            console.log('token_address', token_address);
            if (token_address) {
              var token = Token.at(token_address);
              var token_balance = token.balanceOf(account, {}, block);
              var token_in_ether = token_balance * rep_eth;
              console.log('REP->ETH', token_balance, token_in_ether, rep_eth)
              if (token_balance > 0) {
                total+= token_in_ether;
                token_balance = web3.fromWei(token_balance, 'ether');
                token_balance = numeral(token_balance.toNumber()).format('0.00a');
                token_in_ether = web3.fromWei(token_in_ether, 'ether');
                token_in_ether = numeral(token_in_ether).format('0.00a');
                console.log('TOTAL', total, token_in_ether, total + token_in_ether)
                sendMessage(session, `${account.slice(0,7)}... has REP ${token_balance}`)
                sendMessage(session, `Worth ETH${token_in_ether} \n(1REP = ETH ${rep_eth})`)
              }
            }
          }
          total = web3.fromWei(total, 'ether');
          var usd = numeral(total * eth_usd).format('0.00a');
          total = numeral(total).format('0.00a');
          sendMessage(session, `The total ETH: ${total} \n($${usd}, 1ETH = $${eth_usd})`)
        }).catch(console.error)
      }
      break
    }
}

function add_accounts_response(session){
  sendMessage(session, 'Please copy&paste your ether address below');
}

function welcome(session) {
  sendMessage(session, `Welcome to Balances. I am still a 👶. if I get stuck on a 🐛, simply type "Reset" in the command line.`)
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
        {type: "button", label: "Add Accounts", value: `add_accounts`},
        {type: "button", label: "List Accounts", value: `list_accounts`},
        {type: "button", label: "Reset Accounts", value: `reset_accounts`},
        {type: "button", label: "Track Augur Token 👊", value: `track_token 0x48c80F1f4D53D5951e5D5438B54Cba84f29F32a5`},
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
        {type: "button", label: "Back in a day 👶", value: `display_balance ${-1}`}
      ]
    }
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}
