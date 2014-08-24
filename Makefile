#!/bin/bash

BIN=~/.nvm/current/bin
LIB=./lib/tokenize-anything.min.js
SRC=./src/tokenize-anything.js
VERSION=`cat package.json | grep version | sed -r 's/.*([0-9]+\.[0-9]+\.[0-9]+).*/\1/'`

build:
	uglifyjs $(SRC) -m --comments | sed "s:@version:$(VERSION):" > $(LIB)

