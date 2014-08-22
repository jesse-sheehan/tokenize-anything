BIN = ~/.nvm/current/bin
LIB = ./lib/tokenize-anything.min.js
SRC = ./src/tokenize-anything.js

build:
	uglifyjs $(SRC) -mo $(LIB) --comments

