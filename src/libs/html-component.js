//////// HtmlElement constructor and methods
//////// Version 3.0

function HtmlElement(elem) {
  //elem: type | whole elem | json
  this.initArgs = elem;
  const inputDataType =
    typeof elem === "string" ? "string" : elem?.nodeType ? "nodeType" : "json";

  if (typeof elem === "string") {
    this.element = document.createElement(elem);
  } else if (elem?.nodeType) {
    this.element = elem;
  } else {
    const elemType = elem?.type || "DIV";
    this.element = document.createElement(elemType);
  }

  this.tagName = this.element.tagName.toUpperCase();

  switch (this.tagName) {
    case "DIV":
    case "LI":
    case "SPAN":
    case "P":
    case "BUTTON":
    case "LABEL":
    case "A":
      this.bindValue = "textContent";
      break;
    case "INPUT": {
      let type;

      if (typeof elem === "string") {
        this.bindValue = "value";
        break;
      }

      if (elem?.nodeType) {
        type = (this.element.type || "").toLowerCase();
      } else {
        type = elem?.attrs?.type || "";
      }

      switch (type) {
        case "checkbox":
        case "radio":
          this.bindValue = "checked";
          break;
        default:
          this.bindValue = "value";
      }
      break;
    }
    case "TEXTAREA":
    case "SELECT":
    case "OPTION":
      this.bindValue = "value";
      break;
    default:
      this.bindValue = null;
  }

  if (this.bindValue !== "textContent") {
    if (inputDataType === "json" && "textContent" in elem)
      this.element.textContent = elem.textContent;

    Object.defineProperty(this, "textContent", {
      get: () => this.element.textContent,
      set: (val) => {
        this.element.textContent = val;
      },
    });
  }

  if (this.bindValue === "checked") {
    if (inputDataType === "json")
      this.element.checked = Boolean(elem?.value ?? false);

    Object.defineProperty(this, "value", {
      get: () => this.element.checked,
      set: (val) => {
        this.element.checked = Boolean(val);
      },
    });
  } else if (this.bindValue === "value") {
    if (inputDataType === "json") this.element.value = elem?.value ?? "";

    Object.defineProperty(this, "value", {
      get: () => this.element.value,
      set: (val) => {
        this.element.value = val;
      },
    });
  } else if (this.bindValue === "textContent") {
    if (inputDataType === "json") this.element.textContent = elem?.value ?? "";

    Object.defineProperty(this, "value", {
      get: () => this.element.textContent,
      set: (val) => {
        this.element.textContent = val ?? "";
      },
    });
  }

  if (!elem?.nodeType && elem?.id) {
    this.element.id = elem.id;
  }

  Object.defineProperty(this, "classes", {
    get: () => this.element.className,
    set: (val) => {
      this.element.className = Array.isArray(val) ? val.join(" ") : String(val);
    },
  });

  if (!elem?.nodeType && elem?.classes) {
    this.classes = elem.classes;
  }

  if (!elem?.nodeType && elem?.events && typeof elem.events === "object") {
    this.events = {};

    for (let key in elem.events) {
      const handlers = Array.isArray(elem.events[key])
        ? elem.events[key]
        : [elem.events[key]];

      handlers.forEach((handler) => {
        if (typeof handler === "function") {
          this.element.addEventListener(key, handler);

          if (!this.events[key]) {
            this.events[key] = [];
          }
          this.events[key].push(handler);
        }
      });
    }
  }

  Object.defineProperty(this, "attrs", {
    get: () => {
      const obj = {};
      for (let attr of this.element.attributes) {
        obj[attr.name] = attr.value;
      }
      return obj;
    },
    set: (obj) => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.element.setAttribute(key, obj[key]);
        }
      }
    },
  });

  if (!elem?.nodeType && elem?.attrs) {
    this.attrs = elem.attrs;
  }

  Object.defineProperty(this, "styles", {
    get: () => {
      const obj = {};
      for (let i = 0; i < this.element.style.length; i++) {
        const key = this.element.style[i];
        obj[key] = this.element.style.getPropertyValue(key);
      }
      return obj;
    },
    set: (obj) => {
      for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
          this.element.style.setProperty(key, obj[key]);
        }
      }
    },
  });

  if (!elem?.nodeType && elem?.styles) {
    this.styles = elem.styles;
  }

  if (elem?.clients) {
    // clients: [[HtmlElement, cb], HtmlElement, ...]
    this.clients = new Map();

    elem.clients.forEach((item) => {
      let client, cb, listener;

      if (Array.isArray(item)) {
        [client, cb] = item;
        listener = (e) => cb.call(this, e);
      } else if (item instanceof HtmlElement) {
        client = item;
        listener = () => client.setValue(this.value);
      }

      this.clients.set(client, listener);
      this.element.addEventListener("change", listener);
    });
  }
}

HtmlElement.create = function (elem) {
  return new HtmlElement(elem);
};

HtmlElement.getById = function (id) {
  const elem = document.getElementById(id);
  return elem ? new HtmlElement(elem) : null;
};

HtmlElement.getBySelector = function (selector) {
  const elem = document.querySelector(selector);
  return elem ? new HtmlElement(elem) : null;
};

HtmlElement.getBySelectorAll = function (selector) {
  const elems = document.querySelectorAll(selector);
  return Array.from(elems).map((el) => new HtmlElement(el));
};

HtmlElement.prototype.remove = function () {
  this.element.remove();
  return this;
};

HtmlElement.prototype.destroy = function () {
  if (this.element && this.element.parentNode) {
    this.element.remove();
  }

  if (this.clients) {
    for (let [client, listener] of this.clients.entries()) {
      if (listener) this.element?.removeEventListener("change", listener);
    }
    this.clients.clear();
  }

  if (this.events) {
    for (let type in this.events) {
      this.events[type].forEach((fn) => {
        this.element?.removeEventListener(type, fn);
      });
    }
    this.events = null;
  }

  const safeKeys = Object.getOwnPropertyNames(this).filter(
    (k) => !["value", "textContent", "classes", "attrs", "styles"].includes(k),
  );
  for (let key of safeKeys) {
    this[key] = null;
  }

  this.element = null;
};

HtmlElement.prototype.addId = function (id) {
  if (id !== undefined) this.element.id = id;
  return this;
};

HtmlElement.prototype.addClass = function (className) {
  className && this.element.classList.add(className);
  return this;
};

HtmlElement.prototype.removeClass = function (className) {
  className && this.element.classList.remove(className);
  return this;
};

HtmlElement.prototype.addClasses = function (...classNames) {
  for (let className of classNames) {
    this.addClass(className);
  }
  return this;
};

HtmlElement.prototype.setValue = function (val) {
  if (this.bindValue) {
    this.element[this.bindValue] = val;
  }
  return this;
};

HtmlElement.prototype.getValue = function () {
  if (!this.bindValue) return undefined;
  return this.element[this.bindValue];
};

HtmlElement.prototype.setAttr = function (attrName, attrVal) {
  if (attrName) {
    this.element.setAttribute(attrName, attrVal);
  }
  return this;
};

HtmlElement.prototype.setStyle = function (styles) {
  //styles object: {display: "block", ...}
  if (!styles) return this;
  for (let key in styles) {
    if (styles.hasOwnProperty(key)) {
      this.element.style.setProperty(key, styles[key]);
    }
  }
  return this;
};

HtmlElement.prototype.addEventListener = function (event, callback) {
  if (!this.events) this.events = {};
  if (!this.events[event]) this.events[event] = [];

  if (!this.events[event].includes(callback)) {
    this.element.addEventListener(event, callback);
    this.events[event].push(callback);
  }

  return this;
};

HtmlElement.prototype.removeEventListener = function (event, callback) {
  if (!this.events || !this.events[event]) return this;

  if (callback) {
    this.element.removeEventListener(event, callback);
    this.events[event] = this.events[event].filter((fn) => fn !== callback);
  } else {
    this.events[event].forEach((fn) =>
      this.element.removeEventListener(event, fn),
    );
    this.events[event] = [];
  }

  return this;
};

HtmlElement.prototype.addChild = function (args = {}) {
  const child = HtmlElement.create(args);
  this.append(child);
  return this;
};

HtmlElement.prototype.addChildWithLabel = function (args = {}) {
  const childArgs = Object.fromEntries(
    Object.entries(args).filter(([key]) => !key.startsWith("label_")),
  );

  const child = HtmlElement.create(childArgs);
  this.append(child);

  if (args.id && args.label_value) {
    const label = HtmlElement.create({
      type: "label",
      attrs: {
        for: childArgs.id,
      },
      value: args.label_value,
      classes: args?.label_classes || "",
    });
    this.append(label);
  }

  return this;
};

HtmlElement.prototype.addAndReturnChild = function (args = {}) {
  const child = HtmlElement.create(args);
  this.append(child);
  return child;
};

HtmlElement.prototype.addChildren = function (children = []) {
  for (let child of children) {
    this.addChild(child);
  }
  return this;
};

HtmlElement.prototype.removeChildren = function () {
  this.element.replaceChildren();
  return this;
};

HtmlElement.prototype.getChild = function (selector) {
  const el = this.element.querySelector(selector);
  return el ? new HtmlElement(el) : null;
};

HtmlElement.prototype.append = function (htmlElement) {
  this.element.appendChild(htmlElement.element);
  return this;
};

HtmlElement.prototype.appendTo = function (domElement) {
  const target =
    domElement instanceof HtmlElement ? domElement.element : domElement;
  target.appendChild(this.element);
  return this;
};

HtmlElement.prototype.prependTo = function (domElement) {
  const target =
    domElement instanceof HtmlElement ? domElement.element : domElement;
  target.insertBefore(this.element, target.firstChild);
  return this;
};

HtmlElement.prototype.clone = function (withEvents = false) {
  const clonedDom = this.element.cloneNode(true);
  const clone = new HtmlElement(clonedDom);

  if (this.bindValue) {
    clone.value = this.value;
  }

  clone.classes = this.classes;

  if (this.attrs) {
    for (let attr in this.attrs) {
      if (this.attrs.hasOwnProperty(attr)) {
        clone.element.setAttribute(attr, this.attrs[attr]);
      }
    }
  }

  if (this.styles) {
    for (let style in this.styles) {
      if (this.styles.hasOwnProperty(style)) {
        clone.element.style.setProperty(style, this.styles[style]);
      }
    }
  }

  if (withEvents && this.events) {
    clone.events = {};
    for (let type in this.events) {
      const handlers = Array.isArray(this.events[type])
        ? this.events[type]
        : [this.events[type]];
      clone.events[type] = [];
      handlers.forEach((handler) => {
        clone.element.addEventListener(type, handler);
        clone.events[type].push(handler);
      });
    }
  }

  return clone;
};

HtmlElement.prototype.addClient = function (client, cb) {
  if (!this.clients) this.clients = new Map();

  let listener;
  if (!cb && client instanceof HtmlElement) {
    listener = () => client.setValue(this.value);
  } else {
    listener = (e) => cb.call(this, e);
  }

  this.clients.set(client, listener);
  this.element.addEventListener("change", listener);

  return this;
};

HtmlElement.prototype.removeClient = function (client) {
  if (!this.clients || !this.clients.has(client)) return this;

  const cb = this.clients.get(client);
  if (cb) {
    this.element.removeEventListener("change", cb);
  }
  this.clients.delete(client);

  return this;
};

HtmlElement.prototype.clearClients = function () {
  if (!this.clients) return this;

  for (let [client, cb] of this.clients.entries()) {
    if (cb) {
      this.element.removeEventListener("change", cb);
    }
  }
  this.clients.clear();

  return this;
};

//////// wrappers

function includeFileCSS(cssUrl) {
  HtmlElement.create({
    type: "link",
    attrs: {
      rel: "stylesheet",
      href: cssUrl,
    },
  }).appendTo(document.head);
}

function includeFileJS(jsUrl) {
  HtmlElement.create({
    type: "script",
    attrs: {
      src: jsUrl,
      defer: "",
    },
  }).appendTo(document.head);
}

export { HtmlElement, includeFileCSS, includeFileJS };
