/*
* tokenize-anything - a module for tokenizing source code
*/
module.exports = {
  
  /** 
  * Returns an array of tokens with chainable properties
  * 
  * @method tokenize
  * @param {Array} t_defs
  * @param {String} source
  * @return {Array}
  */
  tokenize: function(t_defs, source) {
    var index = 0, t_list = [];
    
    // make each obj.patterns into a list and make every regex start with a caret
    t_defs.map(function(c) {
      c.patterns = [].concat(c.patterns)
        .map(function(p,i,a) {
          if (p.source[0] != '^')
            return a[i] = new RegExp('^' + p.source);
          return p;
      });
    });
    
    // loop over each character of the source
    while (index < source.length) {
      
      // get the remaining source code
      var remaining_source = source.substr(index);
      
      // iterate over each token definition until we find a match
      for (var t_def_index = 0; t_def_index < t_defs.length; t_def_index++) {
        
        var t_name = t_defs[t_def_index].name,
            t_patterns = t_defs[t_def_index].patterns;
        
        // if the token definition matches then push the new token and break
        if (t_patterns.some(function(pattern) {
          
          var match = pattern.exec(remaining_source);
          
          if (match !== null && typeof(match) != 'undefined') {
            
            // increment the index by the length of the matching text
            index += match[0].length - 1;
            
            // push the new token onto the list
            t_list.push({
              'name': t_name,
              'index': index,
              'value': match[0]
            });
            
            return true;
          }
          
          return false;
        })) break;
      }
      
      index++;
    }
    
    return module.exports._make_chainable(t_list, t_defs);
  },
  
  /**
  *  Returns an array of tokens with chainable properties with the specified token(s) removed
  * 
  * @method remove
  * @param {Array} t_list
  * @param {Object} t_names
  * @return {Array}
  */
  remove: function(t_list, t_names) {
    t_names = [].concat(t_names); // in case t_names is a string
    return module.exports._make_chainable(t_list.filter(function(x) {
      return t_names.indexOf(x.name) == -1;
    }), t_list.token_definitions);
  },
  
  /**
  * Returns true if the specified token is in the list
  *
  * @method contains
  * @param {Array} t_list
  * @param {String} t_name
  * @return {Boolean}
  */
  contains: function(t_list, t_name) {
    return t_list.some(function(x){return x.name == t_name;});
  },
  
  /**
  * Returns a chainable array of tokens with composite tokens defined
  *
  * @method compose
  * @param {Array} t_list
  * @param {String} t_name
  * @param {String} open_edge
  * @param {String} close_edge
  * @param {Object} options
  * @return {Array}
  */
  compose: function(t_list, t_name, open_edge, close_edge, options) {
    var index = 0, new_t_list = [];
    
    var in_block = false, block_index, block_value;
    
    // indicates depth level for edge balancing, the exit depth is always 0
    var depth = 0;
    
    // set the defaults for the options
    if (options === null || typeof(options) == 'undefined') {
      options = {
        balance_edges: false,
        include_edges: false,
        preserve_edges: false,
        recurse: false
      };
    } else {
      if (options.preserve_edges === null || typeof(options.preserve_edges) == 'undefined')
        options.preserve_edges = false;
      if (options.balance_edges === null || typeof(options.balance_edges) == 'undefined')
        options.balance_edges = false;
      if (options.include_edges === null || typeof(options.include_edges) == 'undefined')
        options.include_edges = false;
      if (options.recurse === null || typeof(options.recurse) == 'undefined')
        options.recurse = false;
    }

    while (index < t_list.length) {
      
      // If we are currently inside a block
      if (in_block) {
        
        if (t_list[index].name == close_edge) {
        
          depth--;
          
          // If we are at the exit depth or aren't balancing edges...
          if (options.balance_edges && depth === 0 || !options.balance_edges) {
            
            in_block = false;
            
            if (options.include_edges)
              block_value += t_list[index].value;
            
            var children = [];
            	
            if (typeof(options.recurse) == 'boolean') {
              if (options.recurse === true) {
                // tokenize the block using t_defs
                children = module.exports.tokenize(t_list.token_definitions, block_value);
              }
            } else {
              // tokenize the block using different token definitions
              children = module.exports.tokenize(options.recurse, block_value); 
            }
            
            children = module.exports.compose(module.exports._make_chainable(children, t_list.token_definitions), t_name, open_edge, close_edge, options);
            
            // Append the newly created block token to the new_t_list
            new_t_list.push({
              name: t_name,
              index: block_index,
              value: block_value,
              children: children
            });
            
            if (options.preserve_edges)
              new_t_list.push(t_list[index]);
          } else {
            
            block_value += t_list[index].value;
          }
        } else {
          
          if (t_list[index].name == open_edge) {
            depth++;
          }
          
          // We are in the block but the current token is not an end token so we
          // add the value of the current token to the block_value
          block_value += t_list[index].value;
        }
      } else {
        
        // If we are in the block and the current block is a start token...
        if (t_list[index].name == open_edge) {
          
          depth++;
          
          if (options.preserve_edges)
            new_t_list.push(t_list[index]);
          
          in_block = true;
          block_index = index + 1;
          block_value = options.include_edges ? t_list[index].value : '';
        } else {
          
          // If we aren't in the block and the current token isn't the starting token then
          // just push the current token onto the new_t_list
          new_t_list.push(t_list[index]);
        }
      }
      
      index += 1;
    }
    
    return module.exports._make_chainable(new_t_list, t_list.token_definitions);
  },
  
 //  map: function(t_list, callback, options
   
  /**
  * Returns a copy of the array with chainable properties
  * 
  * @method _make_chainable
  * @param {Array} array
  * @return {Array}
  */
  _make_chainable: function(array, t_defs) {
    
    // default t_defs to array.token_definitions or []
    if (t_defs === null || typeof(t_defs) == 'undefined') {
      if (array.token_definitions === null || typeof(array.token_definitions) == 'undefined') {
        t_defs = [];
      }  else {
        t_defs = array.token_definitions;
        // TODO: doesn't seem to work. never finds the parent definitions
      }
    }
    
    // Check whether this array has already been made chainable
    if (array.is_chainable === null || typeof(array.is_chainable) == 'undefined' || array.is_chainable === false) {
      
      // Make a copy of the array, we do not perform operations on the argument
      var array_copy = array.splice(0);
      
      array_copy.compose = function(t_name, open_edge, close_edge, options) {
        return module.exports.compose(this, t_name, open_edge, close_edge, options);
      };
      
      array_copy.remove = function(t_names) {
        return module.exports.remove(this, t_names);
      };
      
      array_copy.contains = function(t_name) {
        return module.exports.contains(this, t_name);
      };
      
      // Set the is_chainable variable so we don't make this array chainable again
      array_copy.is_chainable = true;
      
      // Set the token_definitions
      array_copy.token_definitions = t_defs;
      
      return array_copy;
    }
    
    // Return the original array, it is already chainable, no need to add the methods to it
    return array;
  }
};
