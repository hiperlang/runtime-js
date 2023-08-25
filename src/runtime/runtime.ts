/*!
 * Hyper Runtime v0.1
 * (c) 2023 Timur Fayzrakhmanov
 * Released under the MIT License
 * https://github.com/timfayz/hyper
 */

/**
 * Configuration Initialization
 *
 * This block is executed as soon as the document begins to load and should have
 * access to the <script> element that imports this runtime.
 */
if (document.currentScript) {
  const scriptAttributes = document.currentScript.attributes;
  // if [scoped] attribute is set
  const scoped = scriptAttributes.getNamedItem("[scoped]");
  if (scoped) {
    // pass it on the <html> element as a means of maintaining global runtime state
    document.documentElement.setAttribute("scoped", scoped.value);
  }
}

/**
 * Hyper Runtime Initialization
 *
 * This block is executed when the document is fully loaded.
 */
document.addEventListener("DOMContentLoaded", () => {
  parseHyperOnEvery(getTargets()); // magic starts here
});

/**
 * getTargets
 *
 * ...
 * TODO: [shadow]
 */
function getTargets(): NodeListOf<Element> | Element[] {
  // prepare nodes for hyper runtime to operate on
  let nodes = undefined;

  // the runtime will operate exclusively on the targets defined in
  // the [scoped] attribute
  let scoped = document.documentElement.getAttribute("scoped");
  switch (scoped) {
    case null:
      // if [scoped] is not present, operate on the entire document
      nodes = [document.documentElement];
      break;

    case "":
      // if [scoped] is present and unvalued, operate on <x-hyper> elements
      nodes = document.querySelectorAll("x-hyper");
      assert(
        nodes.length > 0,
        `<script> loading hyper runtime has unvalued [scoped] attribute. It requires at least one <x-hyper> element to be present in the document but none found.`
      );
      break;

    default:
      // if [scoped] is present and non-empty, operate on the provided pattern
      nodes = document.querySelectorAll(scoped);
      assert(
        nodes.length > 0,
        `<script> loading hyper runtime has [scoped] attribute set to ${scoped}, but no matching elements were found.`
      );
      break;
  }

  // hide the nodes we operate on as soon as possible
  nodes.forEach((n) => {
    // by setting the "hidden" attribute we make sure
    // they are not visible to the user while processing
    n.setAttribute("hidden", "");
  });

  return nodes;
}

/**
 * parseHyperOnEvery
 *
 * ...
 */
function parseHyperOnEvery(nodes: NodeListOf<Element> | Element[]) {
  // operate on every node's tree
  nodes.forEach((node) => {
    // if [bypass] is present
    // do not operate and keep the original tree "as is"
    if (node.hasAttribute("[bypass]")) return;

    // if [plain] is present
    // remove the original tree and print it as plain text
    if (node.hasAttribute("[plain]")) {
      const parent = node.parentElement;
      // parent is always present
      const leadSpaceIdx = parent!.innerHTML.indexOf("<hyper ");
      const leadSpaceMatch = parent!.innerHTML
        .substring(0, leadSpaceIdx)
        .match(/[ \t]*$/);
      const leadSpace = leadSpaceMatch ? leadSpaceMatch[0] : "";
      const pre = document.createElement("pre");
      pre.textContent = leadSpace + node.outerHTML;
      node.replaceWith(pre);
      return;
    }

    // parse children
    const resultingNodes = parseChildren(node);
    node.replaceChildren(...resultingNodes);

    // done, unhide
    node.toggleAttribute("hidden");
    globalDefs.clear();
  });
}

/**
 * parseChildren
 *
 * Constructs a new tree based on the content of the original node, while
 * keeping the original node tree unchanged.
 */
function parseChildren(parent: Element): Node[] {
  const tree: Node[] = [];
  // iterate over all parent nodes types:
  // <tag>, text, <!--comment-->
  parent.childNodes.forEach((child) => {
    switch (child.nodeType) {
      // plain text
      case Node.TEXT_NODE:
        // no need to parse, just clone and push
        tree.push(child.cloneNode());
        break;

      // <tag>
      case Node.ELEMENT_NODE:
        const ch = child as Element;
        // (redundant?) make it case-insensitive
        const childName = ch.nodeName.toUpperCase();
        // if <tag> name begins with 'x'
        if (childName.startsWith("X")) {
          // dispatch
          switch (childName) {
            case "X-RUN":
              // TODO: handle x-run
              break;
            case "X-DEF":
              parseDef(ch); // modifies global
              break;
            case "X-IF":
              // TODO: handle x-if
              break;
            case "X-REP":
              tree.push(...parseRep(ch));
              break;
            default:
              parseError(
                `\`${childName}\` is an unrecognized Hyper node and will be excluded from the output tree`
              );
          }
        }
        // if <tag> name does not begin with 'x'
        else {
          // then, it might be a user-defined <my_tag>
          const tryDefinedNode = parseRef(ch);
          if (tryDefinedNode) {
            tree.push(tryDefinedNode);
            return;
          }
          // otherwise, it must be an ordinary HTML <tag>,
          // just clone it and keep parsing recursively
          const cloned = ch.cloneNode();
          const chTree = parseChildren(ch);
          chTree.forEach((ch) => {
            cloned.appendChild(ch);
          });
          tree.push(cloned);
        }
        break;

      // <!--comment-->, etc.
      default:
      // ignore all others
    }
  });
  return tree;
}

/**
 * parseRef
 *
 * Parses the <name> tag and retrieves a node by its name if defined.
 * If the node is not found, undefined is returned.
 */
function parseRef(node: Element): Element | undefined {
  // TODO: templates and slots
  return globalDefs.get(node.nodeName);
}

/**
 * parseDef
 *
 * Parses the <x-def name> tag and creates a new node that can be referenced
 * later using <name>.
 * TODO: [lazy], [const], templates, slots
 */
function parseDef(node: Element) {
  // there must be at least one attribute for a name
  assert(node.attributes.length > 0, "<x-def> Name is missing.");
  const name = node.attributes[0].name;
  const val = node.attributes[0].value;
  // name should be an attribute without a value
  assert(
    val == "",
    `<x-def> name "${name}" should not have a value part in \`${name}="${val}"\`.`
  );
  // name must be a valid tag name
  assert(
    isValidHTMLTagName(name),
    `<x-def> "${name}" is a reserved HTML tag name and cannot be used as a custom name.`
  );
  // name shouldn't be one of the common attribute names
  assert(
    !isCommonHTMLAttrName(name),
    `<x-def> "${name}" is a common HTML attribute name.`
  );
  // name shouldn't be one of the standard HTML tags
  assert(
    !isHTMLTagName(name),
    `<x-def> "${name}" is one of the standard HTML tags.`
  );
  // name should not be already defined
  assert(
    globalDefs.get(name.toUpperCase()) == null,
    `<x-def> "${name}" already exists.`
  );

  // parse content first
  const subtree = parseChildren(node);

  // prepare a node
  const newNode = document.createElement(name);

  // copy attributes from the original element
  // excluding first (which is the name itself)
  for (let i = 1; i < node.attributes.length; i++) {
    const attribute = node.attributes[i];
    newNode.setAttribute(attribute.name, attribute.value);
  }

  // move all child nodes from the original element
  for (let i = 0; i < subtree.length; i++) {
    newNode.appendChild(subtree[i]);
  }

  // add a new node to the list of definitions
  globalDefs.set(name.toUpperCase(), newNode);
}

/**
 * parseRep
 *
 * Parses the <x-rep n> where n is the number of times the content inside
 * should be repeated.
 */
function parseRep(node: Element): Node[] {
  // <x-rep> should have at least one attribute for a number of repetitions
  assert(
    node.attributes.length > 0,
    "<x-rep> Missing the number of reps to do."
  );
  // <x-rep> should have children to repeat
  assert(node.hasChildNodes(), "<x-rep> Cannot be empty.");

  // parse the number of repetitions
  const match = node.attributes[0].name.match(/\d+/);
  assert(
    match != null,
    "<x-rep> Unable to recognize the number of reps as its first attribute."
  );
  const n = parseInt(match![0], 10);

  // TODO: [notrail]

  // spawn children n times
  const children = parseChildren(node);
  const tree: Node[] = [];
  for (let i = 0; i < n!; i++) {
    children.forEach((child) => {
      tree.push(child.cloneNode(true));
    });
  }
  return tree;
}

// Checks if a given name is a valid attribute embraced in `[attr]`
function isValidHyperAttrName(str: string) {
  const regex = /^\[[a-z0-9\-_]+\]$/i;
  return regex.test(str);
}

// Checks if a given attribute name is a common HTML attribute
function isCommonHTMLAttrName(str: string) {
  return globalCommonHTMLAttrs.has(str);
}

// Checks if a given name is one of the standard HTML tags
function isHTMLTagName(str: string) {
  return globalHTMLTagNames.has(str);
}

// Checks if a given name is a valid tag name
function isValidHTMLTagName(str: string) {
  const regex = /^[a-z][\w-]+$/i;
  return regex.test(str);
}

// Asserts that cond is true, otherwise throws the msg error
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error("Hyper.ParseError: " + msg + " Terminate...");
  // if (!cond) parseError(msg);
}

// Prints the msg into stderr
function parseError(msg: string) {
  console.error("Hyper.ParseError: " + msg + ".");
}

function getSiblingPosition(node: Element) {
  // if node has no parent
  if (!node.parentNode) return null;

  const parent = node.parentNode;
  const children = parent.childNodes;

  let sibPos = null;
  for (let i = 0; i < children.length; i++) {
    if (children[i] === node) {
      // add 1 for 1-based position
      sibPos = i + 1;
      break;
    }
  }

  return sibPos;
}

const globalDefs: Map<string, Element> = new Map();
const globalCommonHTMLAttrs: Set<string> = new Set([
  "class",
  "id",
  "style",
  "src",
  "href",
  "alt",
  "title",
  "target",
  "disabled",
  "readonly",
  "value",
  "placeholder",
  "required",
  "checked",
  "selected",
  "maxlength",
  "min",
  "max",
  "rows",
  "cols",
  "colspan",
  "rowspan",
]);
const globalHTMLTagNames = new Set<string>([
  "a",
  "abbr",
  "acronym",
  "address",
  "applet",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "basefont",
  "bdi",
  "bdo",
  "big",
  "blockquote",
  "body",
  "br",
  "button",
  "canvas",
  "caption",
  "center",
  "cite",
  "code",
  "col",
  "colgroup",
  "data",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "dialog",
  "dir",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "fieldset",
  "figcaption",
  "figure",
  "font",
  "footer",
  "form",
  "frame",
  "frameset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hr",
  "html",
  "i",
  "iframe",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "legend",
  "li",
  "link",
  "main",
  "map",
  "mark",
  "meta",
  "meter",
  "nav",
  "noframes",
  "noscript",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "picture",
  "pre",
  "progress",
  "q",
  "rp",
  "rt",
  "ruby",
  "s",
  "samp",
  "script",
  "section",
  "select",
  "small",
  "source",
  "span",
  "strike",
  "strong",
  "style",
  "sub",
  "summary",
  "sup",
  "svg",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "title",
  "tr",
  "track",
  "tt",
  "u",
  "ul",
  "var",
  "video",
  "wbr",
]);
