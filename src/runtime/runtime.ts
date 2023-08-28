/*!
 * Hyper Runtime v0.1
 * (c) 2023 Timur Fayzrakhmanov
 * MIT License
 * https://github.com/timfayz/hyper
 */

/**
 * ***************************
 * Types
 * ***************************
 */

class TargetNode {
  readonly origin: Element;
  currNode: Element;
  scope: ScopeManager = new ScopeManager();
  supportedAttrs: Set<string>;

  // supportsAttribute(): boolean

  assertAttributeSupport(name: string) {
    assert(
      this.supportedAttrs.has(name),
      `Attribute \`${name}\` is not supported by "${this.currNode.nodeName}" target`
    );
  }

  getAttribute(name: string): string | undefined {
    this.assertAttributeSupport(name);
    const attr = this.currNode.attributes.getNamedItem(name);
    return attr?.value;
  }

  hasAttribute(name: string): boolean {
    this.assertAttributeSupport(name);
    return this.currNode.attributes.getNamedItem(name) != null;
  }

  constructor(origin: Element, supportedAttrs: string[]) {
    this.origin = origin;
    this.currNode = origin;
    this.supportedAttrs = new Set(supportedAttrs);
  }
}

class ScopeManager {
  scopes: Map<string, Element>[] = [];

  currentScope() {
    return this.scopes[this.scopes.length - 1];
  }

  newScope() {
    this.scopes.push(new Map<string, Element>());
  }

  leaveScope() {
    if (this.scopes.length > 0) {
      this.scopes.pop();
    }
  }

  addName(name: string, node: Element) {
    this.currentScope().set(name, node);
  }

  // find a name traversing scopes upwards
  resolveName(name: string): Element | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      if (this.scopes[i].has(name)) {
        return this.scopes[i].get(name);
      }
    }
    return undefined;
  }
}

/**
 * ***************************
 * Global State
 * ***************************
 */

const TARGET_NODES: TargetNode[] = [];
const TARGET_OPTIONS = ["[skip]"];

let RUNTIME_LOADING_NODE: TargetNode | null = null;
const RUNTIME_LOADING_OPTIONS = ["[scope]", "[skip]"];

/**
 * ***************************
 * State Initialization
 * ***************************
 */

/**
 * This block executes as soon as the document begins to load. Check if we
 * have access to the <script> element to import hyper options.
 */
initRuntimeLoadingNode();

/**
 * Initialize targets as soon as the document is fully loaded and
 * start parsing each target separately.
 */
document.addEventListener("DOMContentLoaded", () => {
  initTargetNodes();
  parseTargetNodes();
});

function initTargetNodes() {
  if (RUNTIME_LOADING_NODE?.hasAttribute("[skip]")) return;
  if (RUNTIME_LOADING_NODE?.hasAttribute("[scope]")) {
    const scope = RUNTIME_LOADING_NODE.getAttribute("[scope]");
    assert(
      scope != "",
      `<script> loading hyper runtime has [scope] attribute set to "" (empty), which means no matching elements could be found for runtime to operate on. If you want to temporarily disable runtime, consider using [skip] attribute instead.`
    );
    const targets = document.querySelectorAll(scope!);
    assert(
      targets.length > 0,
      `<script> loading hyper runtime has [scope] attribute set to \`${scope}\`, but no matching elements were found.`
    );
    targets.forEach((target) => {
      TARGET_NODES.push(new TargetNode(target, TARGET_OPTIONS));
    });
  } else {
    TARGET_NODES.push(new TargetNode(document.body, TARGET_OPTIONS));
  }
}

function initRuntimeLoadingNode() {
  if (document.currentScript) {
    RUNTIME_LOADING_NODE = new TargetNode(
      document.currentScript,
      RUNTIME_LOADING_OPTIONS
    );
  }
}

/**
 * ***************************
 * Parsing
 * ***************************
 */

function parseTargetNodes() {
  TARGET_NODES.forEach((target) => {
    parseNode(target);
  });
}

function parseHyperBlock(target: TargetNode) {
  target.scope.addName(target.currNode.nodeName, target.currNode);
  target.currNode.setAttribute("hidden", "");
}

function parseNode(target: TargetNode) {
  target.scope.newScope();
  target.currNode.childNodes.forEach((child) => {
    if (child.nodeType != Node.ELEMENT_NODE) return;

    if (child.nodeName.endsWith("#")) {
      target.currNode = child as Element;
      parseHyperBlock(target);
    } else {
      if (HTML_TAG_NAMES.has(child.nodeName)) return;

      const elm = target.scope.resolveName(child.nodeName + "#");
      assert(elm != undefined, "Definition not found");
      child.replaceWith(elm!.cloneNode(true));
    }
  });
  console.log(target.scope);
}

/**
 * ***************************
 * Utilities
 * ***************************
 */

function assert(cond: boolean, msg: string) {
  if (!cond) throw Error("Hyper.ParseError: " + msg);
}

const HTML_TAG_NAMES = new Set<string>([
  "A",
  "ABBR",
  "ACRONYM",
  "ADDRESS",
  "APPLET",
  "AREA",
  "ARTICLE",
  "ASIDE",
  "AUDIO",
  "B",
  "BASE",
  "BASEFONT",
  "BDI",
  "BDO",
  "BIG",
  "BLOCKQUOTE",
  "BODY",
  "BR",
  "BUTTON",
  "CANVAS",
  "CAPTION",
  "CENTER",
  "CITE",
  "CODE",
  "COL",
  "COLGROUP",
  "DATA",
  "DATALIST",
  "DD",
  "DEL",
  "DETAILS",
  "DFN",
  "DIALOG",
  "DIR",
  "DIV",
  "DL",
  "DT",
  "EM",
  "EMBED",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FONT",
  "FOOTER",
  "FORM",
  "FRAME",
  "FRAMESET",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEAD",
  "HEADER",
  "HR",
  "HTML",
  "I",
  "IFRAME",
  "IMG",
  "INPUT",
  "INS",
  "KBD",
  "LABEL",
  "LEGEND",
  "LI",
  "LINK",
  "MAIN",
  "MAP",
  "MARK",
  "META",
  "METER",
  "NAV",
  "NOFRAMES",
  "NOSCRIPT",
  "OBJECT",
  "OL",
  "OPTGROUP",
  "OPTION",
  "OUTPUT",
  "P",
  "PARAM",
  "PICTURE",
  "PRE",
  "PROGRESS",
  "Q",
  "RP",
  "RT",
  "RUBY",
  "S",
  "SAMP",
  "SCRIPT",
  "SECTION",
  "SELECT",
  "SMALL",
  "SOURCE",
  "SPAN",
  "STRIKE",
  "STRONG",
  "STYLE",
  "SUB",
  "SUMMARY",
  "SUP",
  "SVG",
  "TABLE",
  "TBODY",
  "TD",
  "TEMPLATE",
  "TEXTAREA",
  "TFOOT",
  "TH",
  "THEAD",
  "TIME",
  "TITLE",
  "TR",
  "TRACK",
  "TT",
  "U",
  "UL",
  "VAR",
  "VIDEO",
  "WBR",
]);
