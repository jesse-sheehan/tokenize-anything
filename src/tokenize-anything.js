/**
* tokenize-anything - a module for tokenizing source code
* version @version
* 
* The MIT License (MIT)
* 
* Copyright (c) 2014 jesse-sheehan
* 
* Permission is hereby granted, free of charge, to any person obtaining a copy
* of this software and associated documentation files (the "Software"), to deal
* in the Software without restriction, including without limitation the rights
* to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
* copies of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
* 
* The above copyright notice and this permission notice shall be included in all
* copies or substantial portions of the Software.
* 
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
* IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
* FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
* AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
* LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
* OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
* 
* @license
*/

// some self-explanatory helper functions
var isnull=function(obj){return obj===null||typeof(obj)=='undefined';};
var _default=function(obj,val){return isnull(obj)?val:obj;};

module.exports = function(source, definitions, actions) {
  
    var source_index = 0, tokens = [];
    
    // default definitions, actions  to []
    definitions = _default(definitions, []);
    actions = _default(actions, []);
    
    // properly format definitions[0..n].patterns
    definitions.map(function(d) {
      d.pattern = _default(d.pattern, []);
      d.patterns = _default(d.patterns, []);
      d.patterns = [].concat(d.pattern).concat(d.patterns)
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
        action.options = _default(action.options, {});
        
        // switch upon the action type
        switch (action.action) {
          case 'remove': // remove all tokens that have a specific type(s)
            
            // default action.options.names, action.options.name to []
            action.options.name = _default(action.options.name, []);
            action.options.names = _default(action.options.names, []);
            
            // cast to a list (in case a single string was passed)
            action.options.names = [].concat(action.options.name).concat(action.options.names);
            
            // set the tokens to the tokens list without the token names in action.options.names
            tokens = tokens.filter(function(token) { return action.options.names.indexOf(token.name) == -1; });
            break;
          
          case 'compose':
            // create a new token made up of other tokens
            // every token between open and close will be converted
            // there are other options to modify this behaviour. see manual

            var token_index = 0, new_tokens = [];
    
            var in_block = false, block_index, block_value, block_length;
    
            // indicates depth level for edge balancing, the exit depth is always 0
            var depth = 0;
            
            if (isnull(action.options.open) || isnull(action.options.close) || isnull(action.options.name)) break;
             
            // set the defaults for the options
            action.options.preserve = _default(action.options.preserve, false);
            action.options.balance = _default(action.options.balance, false);
            action.options.include = _default(action.options.include, false);
            action.options.recurse = _default(action.options.recurse, false);
            action.options.definitions = _default(action.options.definitions, definitions); // definitions for recursion
            action.options.actions = _default(action.options.actions, actions); // actions for recursion
            
            while (token_index < tokens.length) {
              
              // If we are currently inside a block
              if (in_block) {
                
                if (tokens[token_index].name == action.options.close) {
                
                  depth--;
                  
                  // If we are at the exit depth or aren't balancing edges...
                  if (action.options.balance && depth === 0 || !action.options.balance) {
                    
                    in_block = false;
                      
                    if (action.options.include)
                      block_value += tokens[token_index].value;
                    
                    var children = [];
                    	
                    if (action.options.recurse === true) {
                      // tokenize the composite block
                      children = module.exports(block_value, action.options.definitions, action.options.actions);
                    }
                    
                    // Append the newly created block token to the new_t_list
                    new_tokens.push({
                      name: action.options.name,
                      index: block_index,
                      value: block_value,
                      children: children
                    });
                    
                    if (action.options.preserve)
                      new_tokens.push(tokens[token_index]);
                  } else {
                    
                    block_value += tokens[token_index].value;
                  }
                } else {
                  
                  if (tokens[token_index].name == action.options.open) {
                    depth++;
                  }
                  
                  // We are in the block but the current token is not an end token so we
                  // add the value of the current token to the block_value
                  block_value += tokens[token_index].value;
                }
              } else {
                
                // If we are in the block and the current block is a start token...
                if (tokens[token_index].name == action.options.open) {
                  
                  depth++;
                  
                  if (action.options.preserve)
                    new_tokens.push(tokens[token_index]);
                    
                  in_block = true;
                  block_index = token_index + 1;
                  block_value = action.options.include ? tokens[token_index].value : '';
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

