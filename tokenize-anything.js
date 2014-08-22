/*
* tokenize-anything - a module for tokenizing source code
*/

/** 
* Returns a token tree
* 
* @method _tokenize
* @param {String} source
* @param {Array} definitions
* @param {Array} actions
* @return {Array}
*/
"use_strict";

var _tokenize = function(source, definitions, actions) {
  
    var source_index = 0, tokens = [];
    
    // default definitions, actions  to []
    definitions = _default(definitions, []);
    actions = _default(actions, []);
    
    // properly format definitions[0..n].patterns
    definitions.map(function(d) {
      d.patterns = [].concat(d.patterns)
        .map(function(p,i,a) {
          if (p.source[0] != '^')
            return new RegExp('^' + p.source);
          return p;
      });
    });
    
    // loop over each character of the source
    while (source_index < source.length) {
      
      // get the remaining source code
      var remaining_source = source.substr(source_index);
      
      // iterate over each token definition until we find a match
      definitions.some(function(definition){
        return definition.patterns.some(function(pattern) {
          
          var match = pattern.exec(remaining_source);
          
          if (!isnull(match)) {
            
            // increment the source_index by the length of the matching text
            source_index += match[0].length - 1;
            
            // push the new token onto the list
            tokens.push({
              'name': definition.name,
              'index': source_index,
              'value': match[0]
            });
            
            return true; // match found, breaks out of the parent loop
          }
          
          return false; // no match found, continue loop
        });
      });
      
      source_index++;
    }
    
    // now apply actions (if any)
    if (actions.length > 0) {
      
      actions.map(function(action){
        
        // default actions[0..n].action to ''
        action.action = _default(action.action, '');
        
        // switch upon the action type
        switch (action.action) {
          case 'remove': // remove all tokens that have a specific type(s)
            
            // default action.names to []
            action.names = _default(action.names, []);
            
            // cast to a list (in case a single string was passed)
            action.names = [].concat(action.names);
            
            // set the tokens to the tokens list without the token names in action.names
            tokens = tokens.filter(function(token) { return action.names.indexOf(token.name) == -1; });
            break;
          
          case 'compose':
            // create a new token made up of other tokens
            // every token between open and close will be converted
            // there are other options to modify this behaviour. see manual

            var token_index = 0, new_tokens = [];
    
            var in_block = false, block_index, block_value, block_length;
    
            // indicates depth level for edge balancing, the exit depth is always 0
            var depth = 0;
            
            if (isnull(action.open) || isnull(action.close) || isnull(action.name)) break;
             
            // set the defaults for the options
            action.preserve = _default(action.preserve, false);
            action.balance = _default(action.balance, false);
            action.include = _default(action.include, false);
            action.recurse = _default(action.recurse, false);
            action.definitions = _default(action.definitions, definitions); // definitions for recursion
            action.actions = _default(action.actions, actions); // actions for recursion
            
            while (token_index < tokens.length) {
              
              // If we are currently inside a block
              if (in_block) {
                
                if (tokens[token_index].name == action.close) {
                
                  depth--;
                  
                  // If we are at the exit depth or aren't balancing edges...
                  if (action.balance && depth === 0 || !action.balance) {
                    
                    in_block = false;
                      
                    if (action.include)
                      block_value += tokens[token_index].value;
                    
                    var children = [];
                    	
                    if (action.recurse === true) {
                      // tokenize the composite block
                      children = _tokenize(block_value, action.definitions, action.actions);
                    }
                    
                    // Append the newly created block token to the new_t_list
                    new_tokens.push({
                      name: action.name,
                      index: block_index,
                      value: block_value,
                      children: children
                    });
                    
                    if (action.preserve)
                      new_tokens.push(tokens[token_index]);
                  } else {
                    
                    block_value += tokens[token_index].value;
                  }
                } else {
                  
                  if (tokens[token_index].name == action.open) {
                    depth++;
                  }
                  
                  // We are in the block but the current token is not an end token so we
                  // add the value of the current token to the block_value
                  block_value += tokens[token_index].value;
                }
              } else {
                
                // If we are in the block and the current block is a start token...
                if (tokens[token_index].name == action.open) {
                  
                  depth++;
                  
                  if (action.preserve)
                    new_tokens.push(tokens[token_index]);
                    
                  in_block = true;
                  block_index = token_index + 1;
                  block_value = action.include ? tokens[token_index].value : '';
                } else {
                  
                  // If we aren't in the block and the current token isn't the starting token then
                  // just push the current token onto the new_t_list
                  new_tokens.push(tokens[token_index]);
                }
              }
              
              token_index += 1;
            }
            
            tokens = new_tokens;
            break;
        };
      });
    }
    
    return tokens;
};

// a helper function to recognize when an object is null or undefined
var isnull=function(obj){return obj===null||typeof(obj)=='undefined';};
var _default=function(obj,val){return isnull(obj)?val:obj;};

// export our function
module.exports = _tokenize;
