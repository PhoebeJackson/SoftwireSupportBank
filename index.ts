import {configure, getLogger} from "log4js";
import {DateTime} from "luxon";

configure({
    appenders: {
        file: { type: 'fileSync', filename: 'debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

const logger = getLogger("index.ts")

const csv = require('csv-parser');
const fs = require('fs');
const myPrompt = require("prompt-sync")();

interface RawRow {
    Date: string;
    From: string;
    To: string;
    Narrative: string;
    Amount: string;
}

class Transaction {
    date: DateTime;
    from: string;
    to: string;
    narrative: string;
    amount: number;

    constructor(row: RawRow) {
        this.date = DateTime.fromFormat(row.Date, "d/M/y")
        this.from = row.From
        this.to = row.To
        this.narrative = row.Narrative
        while (isNaN(parseInt(row.Amount))){
            console.log("Amount " + row.Amount + " is not a valid amount")
            row.Amount = myPrompt("What amount would you like instead? £")
        }
        this.amount = parseInt(row.Amount)
    }
}

class Account {
    transactionList: Transaction[];
    balance: number;

    constructor(transaction: Transaction) {
        this.transactionList = [transaction]
        this.balance = 0

    }

}


const transactions: Transaction[] = [];
fs.createReadStream('DodgyTransactions2015.csv')
    .pipe(csv())
    .on('data', (row: RawRow) => {
        const transaction = new Transaction(row);
        transactions.push(transaction);
    })
    .on('end', () => {
        createAccounts(transactions)
    });

function createAccounts(transactions: Transaction[]) {
    const accounts: {[key: string] : Account} = {};
    transactions.forEach((transaction1: Transaction) => {
        const toPerson = transaction1.to
        const fromPerson = transaction1.from

        if (accounts[toPerson] === undefined){
            accounts[toPerson] = new Account(transaction1);
        } else {
            accounts[toPerson].transactionList.push(transaction1);
        }
        if (accounts[fromPerson] === undefined){
            accounts[fromPerson] = new Account(transaction1);
        } else {
            accounts[fromPerson].transactionList.push(transaction1);
        }
        accounts[toPerson].balance += transaction1.amount;
        accounts[fromPerson].balance -= transaction1.amount;
    })
    printToConsole(accounts)
}

function listAll(accounts: {[key: string] : Account}){
    for (const person in accounts) {
        console.log(person + " has balance " + sign(accounts[person].balance) + "£" + Math.abs(accounts[person].balance))
    }
}

function listName(accounts: {[key: string] : Account}, person: string){
    console.log(person)
    if (accounts[person] === undefined) {
        console.log("Invalid person")
    } else {
        console.log(accounts[person].transactionList)
    }
}

function printToConsole(accounts: {[key: string] : Account}){
    let command = myPrompt("What would you like to see? - List All or List [Name] ")
    while (command != "None") {
        if (command === "List All") {
            listAll(accounts);
        } else {
            let person = command.slice(5)
            listName(accounts, person)
        }
        command = myPrompt("What would you like to see next? - List All or List [Name] or None ")
    }
}

function sign(balance: number){
    if (Math.sign(balance) === -1){
        return "-"
    } else {
        return ""
    }
}

