'use strict';

const path = require('path');
const fs = require('fs');
const eslint = require('eslint');

function _interopNamespaceCompat(e) {
  if (e && typeof e === 'object' && 'default' in e) return e;
  const n = Object.create(null);
  if (e) {
    for (const k in e) {
      n[k] = e[k];
    }
  }
  n.default = e;
  return n;
}

const eslint__namespace = /*#__PURE__*/_interopNamespaceCompat(eslint);

function applyPolyfills(object, polyfill) {
  return new Proxy(object, {
    get(_target, p) {
      var _a;
      return (_a = object[p]) != null ? _a : polyfill[p];
    }
  });
}

function getParent(node) {
  return node.parent;
}

const cache = /* @__PURE__ */ new WeakMap();
function getSourceCode(context) {
  const original = context.sourceCode || context.getSourceCode();
  const cached = cache.get(original);
  if (cached) {
    return cached;
  }
  const sourceCode = applyPolyfills(original, {
    getScope(node) {
      const inner = node.type !== "Program";
      for (let n = node; n; n = getParent(n)) {
        const scope = original.scopeManager.acquire(n, inner);
        if (scope) {
          if (scope.type === "function-expression-name") {
            return scope.childScopes[0];
          }
          return scope;
        }
      }
      return original.scopeManager.scopes[0];
    },
    markVariableAsUsed(name, refNode = original.ast) {
      const currentScope = sourceCode.getScope(refNode);
      if (currentScope === context.getScope()) {
        return context.markVariableAsUsed(name);
      }
      let initialScope = currentScope;
      if (currentScope.type === "global" && currentScope.childScopes.length > 0 && currentScope.childScopes[0].block === original.ast) {
        initialScope = currentScope.childScopes[0];
      }
      for (let scope = initialScope; scope; scope = scope.upper) {
        const variable = scope.variables.find(
          (scopeVar) => scopeVar.name === name
        );
        if (variable) {
          variable.eslintUsed = true;
          return true;
        }
      }
      return false;
    },
    getAncestors(node) {
      const result = [];
      for (let ancestor = getParent(node); ancestor; ancestor = ancestor.parent) {
        result.unshift(ancestor);
      }
      return result;
    },
    getDeclaredVariables(node) {
      return original.scopeManager.getDeclaredVariables(node);
    },
    isSpaceBetween(first, second) {
      if (first.range[0] <= second.range[1] && second.range[0] <= first.range[1]) {
        return false;
      }
      const [startingNodeOrToken, endingNodeOrToken] = first.range[1] <= second.range[0] ? [first, second] : [second, first];
      const tokens = sourceCode.getTokensBetween(first, second, {
        includeComments: true
      });
      let startIndex = startingNodeOrToken.range[1];
      for (const token of tokens) {
        if (startIndex !== token.range[0]) {
          return true;
        }
        startIndex = token.range[1];
      }
      return startIndex !== endingNodeOrToken.range[0];
    }
  });
  cache.set(original, sourceCode);
  return sourceCode;
}

function getCwd(context) {
  var _a, _b, _c;
  return (_c = (_b = context.cwd) != null ? _b : (_a = context.getCwd) == null ? void 0 : _a.call(context)) != null ? _c : (
    // getCwd is added in v6.6.0
    process.cwd()
  );
}

function getFilename(context) {
  var _a;
  return (_a = context.filename) != null ? _a : context.getFilename();
}

function getPhysicalFilename(context) {
  var _a, _b;
  const physicalFilename = (_b = context.physicalFilename) != null ? _b : (_a = context.getPhysicalFilename) == null ? void 0 : _a.call(context);
  if (physicalFilename != null) {
    return physicalFilename;
  }
  const filename = getFilename(context);
  let target = filename;
  while (/^\d+_/u.test(path.basename(target)) && !fs.existsSync(target)) {
    const next = path.dirname(target);
    if (next === target || !path.extname(next)) {
      break;
    }
    target = next;
  }
  return target;
}

var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};
function getESLint() {
  var _a;
  return (_a = eslint__namespace.ESLint) != null ? _a : getESLintClassForV6();
}
function getESLintClassForV6() {
  const CLIEngine = eslint__namespace.CLIEngine;
  class ESLintForV6 {
    constructor(options) {
      __publicField(this, "engine");
      const {
        overrideConfig: { plugins, globals, rules, ...overrideConfig } = {
          plugins: [],
          globals: {},
          rules: {}
        },
        fix,
        reportUnusedDisableDirectives,
        plugins: pluginsMap,
        ...otherOptions
      } = options || {};
      const newOptions = {
        fix: Boolean(fix),
        reportUnusedDisableDirectives: reportUnusedDisableDirectives ? reportUnusedDisableDirectives !== "off" : void 0,
        ...otherOptions,
        globals: globals ? Object.keys(globals).filter((n) => globals[n]) : void 0,
        plugins: plugins || [],
        rules: rules ? Object.fromEntries(
          Object.entries(rules).flatMap(
            ([ruleId, opt]) => opt ? [[ruleId, opt]] : []
          )
        ) : void 0,
        ...overrideConfig
      };
      this.engine = new CLIEngine(newOptions);
      for (const [name, plugin] of Object.entries(pluginsMap || {})) {
        this.engine.addPlugin(name, plugin);
      }
    }
    static get version() {
      return CLIEngine.version;
    }
    // eslint-disable-next-line @typescript-eslint/require-await -- ignore
    async lintText(...params) {
      var _a;
      const result = this.engine.executeOnText(params[0], (_a = params[1]) == null ? void 0 : _a.filePath);
      return result.results;
    }
    // eslint-disable-next-line @typescript-eslint/require-await -- ignore
    async lintFiles(...params) {
      const result = this.engine.executeOnFiles(
        Array.isArray(params[0]) ? params[0] : [params[0]]
      );
      return result.results;
    }
    // eslint-disable-next-line @typescript-eslint/require-await -- ignore
    static async outputFixes(...params) {
      return CLIEngine.outputFixes({
        results: params[0]
      });
    }
  }
  return ESLintForV6;
}

exports.getCwd = getCwd;
exports.getESLint = getESLint;
exports.getFilename = getFilename;
exports.getPhysicalFilename = getPhysicalFilename;
exports.getSourceCode = getSourceCode;
