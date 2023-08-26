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
  parseOnEvery(getTargets()); // magic starts here
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
      // if [scoped] is present and unvalued, operate on <hyper> elements
      nodes = document.querySelectorAll("hyper");
      assert(
        nodes.length > 0,
        `<script> loading hyper runtime has unvalued [scoped] attribute. It requires at least one <hyper> element to be present in the document but none found.`
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

  return nodes;
}

/**
 * parseHyperOnEvery
 *
 * ...
 */
function parseOnEvery(nodes: NodeListOf<Element> | Element[]) {
  // hide the nodes we operate on as soon as possible
  nodes.forEach((n) => {
    // by setting the "hidden" attribute we make sure
    // they are not visible to the user while processing
    n.addEventListener("click", (e) => {});
    n.setAttribute("hidden", "");
  });

  // operate on every node's tree
  nodes.forEach((node) => {
    // TODO: move attribute handling into separate function?

    // if [bypass] is present
    // do not operate and keep the original tree "as is"
    if (node.hasAttribute("[bypass]")) {
      // if [bypass]="print"
      // print source tree as plain text
      if (node.getAttribute("[bypass]") == "print") {
        const pre = document.createElement("pre");
        pre.textContent = getLeadingSpace(node) + node.outerHTML;
        node.replaceWith(pre);
      }
      return;
    }

    // parse children
    const resultingNodes = parse(node);

    if (node.hasAttribute("[watch]")) {
      // create a new <src> element to store the source tree before parsing
      const src = document.createElement("src");

      // move the children of the target node to the <src> element
      node.childNodes.forEach((e) => {
        src.appendChild(e);
      });

      // clear the content of the target node and append the <src> element
      node.innerHTML = "";
      node.prepend(src);

      // add and attach the result to <output>
      // add eventListener
    }

    // if [print] is present

    node.replaceChildren(...resultingNodes);

    // done, unhide
    node.toggleAttribute("hidden");
    globalDefs.clear();
  });
}

function getLeadingSpace(node: Element) {
  const parent = node.parentElement;
  // parent is always present
  const leadSpaceIdx = parent!.innerHTML.indexOf(
    `<${node.tagName.toLocaleLowerCase()}`
  );
  const leadSpaceMatch = parent!.innerHTML
    .substring(0, leadSpaceIdx)
    .match(/[ \t]*$/);
  return leadSpaceMatch ? leadSpaceMatch[0] : "";
}

/**
 * parseChildren
 *
 * Constructs a new tree based on the content of the original node, while
 * keeping the original node tree unchanged.
 */
function parse(parent: Element): Node[] {
  const tree: Node[] = [];
  // iterate over all nodes types: <tag>, text, <!--comment-->
  parent.childNodes.forEach((child) => {
    switch (child.nodeType) {
      // text
      case Node.TEXT_NODE:
        // no need to parse, just clone and push
        tree.push(child.cloneNode());
        break;

      // <tag>
      case Node.ELEMENT_NODE:
        const child_ = child as Element; // cast
        // make it case-insensitive
        const childName = child_.nodeName.toUpperCase();
        // dispatch
        switch (childName) {
          case "DEF": // <def>
            parseDef(child_); // modifies global
            break;

          case "IF": // <if>
            // TODO: handle if
            break;

          case "REP": // <rep>
            tree.push(...parseRep(child_));
            break;

          default: // <any_other>
            // try finding a user-defined <my_tag>
            const tryDefinedNode = parseRef(child_);
            if (tryDefinedNode) {
              tree.push(tryDefinedNode);
            }
            // otherwise, it must be an ordinary HTML <tag>
            else {
              // just clone it
              const cloned = child_.cloneNode();
              // keep parsing recursively
              const chTree = parse(child_);
              chTree.forEach((ch) => {
                cloned.appendChild(ch);
              });
              tree.push(cloned);
            }
        }
        break;

      // ignore other node types
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
  return globalDefs.get(node.nodeName)?.cloneNode(true) as Element;
}

/**
 * parseDef
 *
 * Parses the <def name> tag and creates a new node that can be referenced
 * later using <name>.
 * TODO: [lazy], [const], templates, slots
 */
function parseDef(node: Element) {
  // there must be at least one attribute for a name
  assert(node.attributes.length > 0, "<def> Name is missing.");
  const name = node.attributes[0].name;
  const val = node.attributes[0].value;
  // name should be an attribute without a value
  assert(
    val == "",
    `<def> name "${name}" should not have a value part in \`${name}="${val}"\`.`
  );
  // name must be a valid tag name
  assert(
    isValidHTMLTagName(name),
    `<def> "${name}" is a reserved HTML tag name and cannot be used as a custom name.`
  );
  // name shouldn't be one of the common attribute names
  assert(
    !isCommonHTMLAttrName(name),
    `<def> "${name}" is a common HTML attribute name.`
  );
  // name shouldn't be one of the standard HTML tags
  assert(
    !isHTMLTagName(name),
    `<def> "${name}" is one of the standard HTML tags.`
  );
  // name should not be already defined
  assert(
    globalDefs.get(name.toUpperCase()) == null,
    `<def> "${name}" already exists.`
  );

  // parse content first
  const subtree = parse(node);

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
 * Parses the <rep n> where n is the number of times the content inside
 * should be repeated.
 */
function parseRep(node: Element): Node[] {
  // <rep> should have at least one attribute for a number of repetitions
  assert(node.attributes.length > 0, "<rep> Missing the number of reps to do.");
  // <rep> should have children to repeat
  assert(node.hasChildNodes(), "<rep> Cannot be empty.");

  // parse the number of repetitions
  const match = node.attributes[0].name.match(/\d+/);
  assert(
    match != null,
    "<rep> Unable to recognize the number of reps as its first attribute."
  );
  const n = parseInt(match![0], 10);

  // TODO: [notrail]

  // spawn children n times
  const children = parse(node);
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
