"use strict";
var config = {
    deckip: "0.0.0.0",
    deckport: "22",
    deckpass: "ssap",
    deckkey: "-i ${env:HOME}/.ssh/id_rsa",
    deckdir: "/home/deck"
};
module.exports = config;
