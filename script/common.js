(function() {

function $(selector, context) {
  if (!(this instanceof $)) return new $(selector, context);

  if (selector == null) return this;
  if (Array.isArray(selector)) return [].push.apply(this, selector);
  if (selector.nodeType || typeof selector === "object") return [].push.call(this, selector);

  let nodes = (context || document).querySelectorAll(selector);
  [].push.apply(this, nodes);
  $.prototype.self = nodes[0];
}

$.prototype = {
  each: function(callback) {
    let i = 0, length = this.length;
    for(; i < length; i++) callback.call(this[i], this[i], i);
    return this;
  },
  on: function(type, listener) {
    return this.each(el => {
      $(type.split(" ")).each(type => {
        el.addEventListener(type, listener, {passive: false});
      });
    });
  },
  hide: function() {
    return this.each((elem) => elem.style.display = "none");
  },
  removeClass: function(className) {
    return this.each(elem => {
      $(className.split(" ")).each(c => elem.classList.remove(c));
    });
  },
  addClass: function(className) {
    return this.each(elem => {
      $(className.split(" ")).each(c => elem.classList.add(c));
    });
  },
  append: function(elems, isClone) {
    return this.each(parent => {
      $(elems).each(elem => {
        parent.appendChild(isClone ? elem.cloneNode(true) : elem);
      });
    });
  },
  val: function(val) {
    return val != null ? this.each(elem => elem.value = val) : this.self.value;
  },
  text: function(text) {
    return this.each(elem => elem.textContent = text);
  },
  checked: function(checked) {
    return checked != null ? this.each(elem => elem.checked = checked) : this.self.checked;
  },
  attrNS: function(id) {
    let ns = "http://www.w3.org/1999/xlink";
    return this.each((el) => el.setAttributeNS(ns, "xlink:href", `icon/sprites.svg#${id}`));
  }
}

$.setStorage = (key, value) => {
  window.localStorage.setItem(key, JSON.stringify(value));
};

$.getStorage = (key) => {
  let data = window.localStorage.getItem(key);
  try {
    return JSON.parse(data);
  } catch(e) {
    return data;
  }
};

window.$ = $;
})();