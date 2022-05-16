// based on code from Brian White @mscdex mariasql library - https://github.com/mscdex/node-mariasql/blob/master/lib/Client.js#L272-L332
// License: https://github.com/mscdex/node-mariasql/blob/master/LICENSE

const RE_PARAM = /(?:\?)|(?::(\d+|(?:[a-zA-Z][a-zA-Z0-9_]*)))/g,
DQUOTE = 34,
SQUOTE = 39,
BSLASH = 92;

function parse(query: string) {
  let ppos = RE_PARAM.exec(query);
  let curpos = 0;
  let start = 0;
  let end;
  const parts = [];
  let inQuote = false;
  let escape = false;
  let qchr;
  const tokens = [];
  let qcnt = 0;
  let lastTokenEndPos = 0;
  let i;

  if (ppos) {
    do {
      for (i=curpos,end=ppos.index; i<end; ++i) {
        const chr = query.charCodeAt(i);
        if (chr === BSLASH)
        escape = !escape;
        else {
          if (escape) {
            escape = false;
            continue;
          }
          if (inQuote && chr === qchr) {
            if (query.charCodeAt(i + 1) === qchr) {
              // quote escaped via "" or ''
              ++i;
              continue;
            }
            inQuote = false;
          } else if (chr === DQUOTE || chr === SQUOTE) {
            inQuote = true;
            qchr = chr;
          }
        }
      }
      if (!inQuote) {
        parts.push(query.substring(start, end));
        tokens.push(ppos[0].length === 1 ? qcnt++ : ppos[1]);
        start = end + ppos[0].length;
        lastTokenEndPos = start;
      }
      curpos = end + ppos[0].length;
    // deno-lint-ignore no-cond-assign
    } while (ppos = RE_PARAM.exec(query));

    if (tokens.length) {
      if (curpos < query.length) {
        parts.push(query.substring(lastTokenEndPos));
      }
      return [parts, tokens];
    }
  }
  return [query];
}
// deno-lint-ignore no-explicit-any
function createCompiler(config: any) {
  if (!config)
  config = {};
  if (!config.placeholder) {
    config.placeholder = '?';
  }

  // deno-lint-ignore no-explicit-any
  function toArrayParams(tree: any, params?: string[]) {
    const arr = [];
    if (tree.length == 1) {
      return [tree[0], []];
    }

    if (typeof params == 'undefined')
      throw new Error('Named query contains placeholders, but parameters object is undefined');

    const tokens = tree[1];
    for (let i=0; i < tokens.length; ++i) {
      arr.push(params[tokens[i]]);
    }
    return [tree[0], arr];
  }

  function noTailingSemicolon(s: string) {
    if (s.slice(-1) == ':') {
      return s.slice(0, -1);
    }
    return s;
  }

  // deno-lint-ignore no-explicit-any
  function join(tree: any) {
    if (tree.length == 1) {
      return tree;
    }

    let unnamed = noTailingSemicolon(tree[0][0]);
    for (let i=1; i < tree[0].length; ++i) {
      if (tree[0][i-1].slice(-1) == ':') {
        unnamed += config.placeholder;
      }
      unnamed += config.placeholder;
      unnamed += noTailingSemicolon(tree[0][i]);
    }

    const last = tree[0][tree[0].length -1];
    if (tree[0].length == tree[1].length) {
      if (last.slice(-1) == ':') {
        unnamed += config.placeholder;
      }
      unnamed += config.placeholder;
    }
    return [unnamed, tree[1]];
  }

  // deno-lint-ignore no-explicit-any
  function compile(query: string, paramsObj: any) {
    const tree = join(parse(query));
    return toArrayParams(tree, paramsObj);
  }

  compile.parse = parse;
  return compile;
}

// named :one :two to postgres-style numbered $1 $2 $3
// deno-lint-ignore no-explicit-any
function toNumbered(q: string, params: any) {
  const tree = parse(q);
  // deno-lint-ignore no-explicit-any
  const paramsArr: any[] = [];
  if (tree.length == 1) {
    return [tree[0], paramsArr];
  }

  // deno-lint-ignore no-explicit-any
  const pIndexes: any = {};
  let pLastIndex = 0;
  let qs = '';
  let varIndex;
  const varNames = [];
  for (let i=0; i < tree[0].length; ++i) {
    varIndex = pIndexes[tree[1][i]];
    if (!varIndex) {
      varIndex = ++pLastIndex;
      pIndexes[tree[1][i]] = varIndex;
    }
    if (tree[1][i]) {
      varNames[varIndex - 1] = tree[1][i];
      qs += tree[0][i] + '$' + varIndex;
    } else {
      qs += tree[0][i];
    }
  }
  return [qs, varNames.map(n => params[n])];
}
export { createCompiler, toNumbered };