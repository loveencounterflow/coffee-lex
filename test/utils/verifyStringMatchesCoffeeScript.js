import { deepEqual } from 'assert';
import * as CoffeeScript from 'decaffeinate-coffeescript';

import lex, {
  HEREGEXP_START,
  INTERPOLATION_START,
  STRING_CONTENT,
  STRING_LINE_SEPARATOR
} from '../../src/index.js';

/**
 * Given code containing a string, herestring, or heregex, verify that the
 * quasis have the expected values, and run the same code through the
 * CoffeeScript lexer to verify that the values match.
 *
 * This function uses a simple and imperfect algorithm to extract the string
 * contents from the coffee-lex and CoffeeScript output, so it should only be
 * given relatively simple cases, e.g. no string literals within interpolations.
 * It can always be made more advanced if more complicated cases are useful to
 * test.
 */
export default function verifyStringMatchesCoffeeScript(code, expectedQuasis) {
  let coffeeLexResult = getCoffeeLexQuasis(code);
  let coffeeScriptResult = getCoffeeScriptQuasis(code);
  deepEqual(coffeeLexResult, coffeeScriptResult);
  deepEqual(coffeeLexResult, expectedQuasis);
}

function getCoffeeLexQuasis(code) {
  let tokens = lex(code);
  let quasis = [''];
  tokens.forEach(token => {
    if (token.type === STRING_CONTENT) {
      quasis[quasis.length - 1] += code.slice(token.start, token.end);
    } else if (token.type === STRING_LINE_SEPARATOR) {
      quasis[quasis.length - 1] += ' ';
    } else if (token.type === INTERPOLATION_START) {
      quasis.push('');
    }
  });
  // As a special case, if this is a heregexp, escaping rules are different, so
  // convert backslash to double backslash. Code using coffee-lex is responsible
  // for adding these escape characters.
  if (tokens.toArray()[0].type === HEREGEXP_START) {
    quasis = quasis.map(str => str.replace(/\\/g, '\\\\'));
  }
  return quasis;
}

function getCoffeeScriptQuasis(code) {
  let tokens = CoffeeScript.tokens(code);
  let resultQuasis = [];
  for (let token of tokens) {
    if (token[0] === 'STRING') {
      resultQuasis.push(
        JSON.parse(token[1].replace(/\t/g, '\\t')).replace(/\\/g, '\\\\')
      );
    } else if (token[0] === 'REGEX') {
      let stringForm = `"${token[1].slice(1, -1)}"`
        .replace(/\\/g, '\\\\')
        .replace(/\t/g, '\\t');
      resultQuasis.push(
        JSON.parse(stringForm).replace(/\\/g, '\\\\')
      );
    }
  }
  return resultQuasis;
}