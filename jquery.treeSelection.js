/** jquery.treeSelection.js — Windy2000, Apache-2.0. https://github.com/windy2006/jquery.treeSelection */
(function ($) {
  "use strict";
  let serial = 0;
  $.fn.treeSelection = function (options) {
    return this.each(function () {
      const select = this,
        $select = $(select),
        old = $select.data("treeSelection");
      if (old) old.destroy();
      if (options === "destroy" || select.tagName !== "SELECT") return;
      const opt = $.extend(
        { multiple: false, max: 999, style: "", class: "" },
        options,
      );
      const original = {
        style: select.getAttribute("style"),
        name: select.getAttribute("name"),
        multiple: select.multiple,
        children: Array.from(select.childNodes, (node) => node.cloneNode(true)),
      };
      if (opt.data !== undefined && !Array.isArray(opt.data))
        throw new TypeError("treeSelection data 必须为数组。");
      const multiple =
        select.multiple || typeof opt.multiple === "number" || !!opt.multiple;
      const limit = Number(
        typeof opt.multiple === "number" ? opt.multiple : opt.max,
      );
      const max = Math.max(0, Number.isFinite(limit) ? limit : 999);
      const ns = ".treeSelection" + ++serial,
        parent = select.parentElement;
      // Shared parent style is restored only after its last instance is destroyed.
      if (!$(parent).data("treeSelectionParent"))
        $(parent).data("treeSelectionParent", {
          style: parent.getAttribute("style"),
          count: 0,
        });
      const parentState = $(parent).data("treeSelectionParent");
      parentState.count++;
      const selector = $("<span>")
        .attr({
          style: $select.attr("style"),
          class: $select.attr("class"),
          tabindex: select.disabled ? -1 : 0,
          role: "button",
          "aria-expanded": "false",
          "aria-label": select.getAttribute("aria-label") || "选择",
        })
        .addClass("treeSelector");
      const grid = $("<div>")
        .attr("style", opt.style)
        .addClass(opt.class)
        .addClass("treeSelection border")
        .hide();
      let disposed = false,
        resetTimer;
      $(parent).css("position", "relative");
      select.multiple = multiple;
      if (multiple && original.name && !original.name.endsWith("[]"))
        select.name = original.name + "[]";
      const inputs = [],
        nativeOptions = [];
      const data =
        opt.data ||
        Array.from(select.children, (node) =>
          node.tagName === "OPTGROUP"
            ? {
                name: node.label,
                items: Array.from(node.children, (item) => ({
                  name: item.text,
                  value: item.value,
                  selected: item.selected,
                  disabled: item.disabled || node.disabled,
                })),
              }
            : {
                name: node.text,
                value: node.value,
                selected: node.selected,
                disabled: node.disabled,
              },
        );
      if (opt.data) select.replaceChildren();
      function build(items) {
        const ul = $("<ul>");
        items.forEach((item) => {
          const info =
            typeof item === "object" && item !== null
              ? item
              : { name: String(item) };
          const li = $("<li>").appendTo(ul),
            label = $("<label>").appendTo(li);
          if (Array.isArray(info.items)) {
            label
              .attr("data-sub", "true")
              .text(info.name == null ? "" : String(info.name));
            li.append(build(info.items));
          } else {
            const index = inputs.length,
              text = String(info.name ?? ""),
              value = String(info.value ?? text);
            let native;
            if (opt.data) {
              native = new Option(
                text,
                value,
                !!info.selected,
                !!info.selected,
              );
              native.disabled = !!info.disabled;
              select.add(native);
            } else native = select.options[index];
            nativeOptions.push(native);
            const input = $("<input>")
              .attr({
                type: multiple ? "checkbox" : "radio",
                "data-text": text,
              })
              .val(value)[0];
            inputs.push(input);
            li.addClass("no-sign");
            label.append(input, document.createTextNode(" " + text));
          }
        });
        return ul;
      }
      grid.append(build(data));
      $select.after(selector).hide();
      grid.appendTo(parent);
      function layout() {
        grid.css({
          width: selector.outerWidth(),
          top: selector.position().top + selector.outerHeight(),
          left: selector.position().left,
        });
      }
      function hide() {
        grid.stop(true, true).slideUp();
        selector.attr("aria-expanded", "false");
      }
      function sync() {
        if (disposed) return;
        selector.empty().attr({
          "aria-disabled": String(select.disabled),
          tabindex: select.disabled ? -1 : 0,
        });
        inputs.forEach((input, index) => {
          const item = nativeOptions[index];
          input.checked = item.selected;
          input.disabled =
            select.disabled || item.disabled || !!item.parentElement.disabled;
          if (item.selected) {
            const badge = $("<b>").text(item.text),
              close = $("<span>").text("X").appendTo(badge);
            close.on("click" + ns, (event) => {
              event.preventDefault();
              event.stopPropagation();
              if (select.disabled || input.disabled) return;
              item.selected = false;
              input.checked = false;
              $select.trigger("change");
            });
            selector.append(badge);
          }
        });
        if (select.disabled) hide();
      }
      selector
        .on("click" + ns, (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (select.disabled) return;
          layout();
          grid.stop(true, true).slideToggle();
          selector.attr("aria-expanded", String(grid.is(":visible")));
        })
        .on("keydown" + ns, (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            selector.trigger("click");
          } else if (event.key === "Escape") hide();
        });
      grid
        .on("click" + ns, (event) => event.stopPropagation())
        .on("change" + ns, "input", function () {
          const index = inputs.indexOf(this);
          if (
            multiple &&
            inputs.filter((input) => input.checked).length > max
          ) {
            this.checked = false;
            window.alert("最多只能选取 " + max + " 个！");
            return;
          }
          if (!multiple)
            nativeOptions.forEach((item, i) => {
              item.selected = i === index;
            });
          else nativeOptions[index].selected = this.checked;
          $select.trigger("change");
          if (!multiple) hide();
        });
      $select.on("change" + ns, sync);
      $(document)
        .on("click" + ns, hide)
        .on("keydown" + ns, (event) => {
          if (event.key === "Escape") hide();
        });
      $(window).on("resize" + ns, layout);
      const form = select.form;
      if (form)
        $(form).on("reset" + ns, () => {
          clearTimeout(resetTimer);
          resetTimer = setTimeout(sync, 0);
        });
      const observer = new MutationObserver(sync);
      observer.observe(select, {
        attributes: true,
        attributeFilter: ["disabled"],
      });
      sync();
      layout();
      $select.data("treeSelection", {
        destroy() {
          disposed = true;
          clearTimeout(resetTimer);
          observer.disconnect();
          $(document).off(ns);
          $(window).off(ns);
          if (form) $(form).off(ns);
          $select.off(ns);
          selector.remove();
          grid.remove();
          [
            ["style", original.style],
            ["name", original.name],
          ].forEach(([key, value]) =>
            value === null
              ? select.removeAttribute(key)
              : select.setAttribute(key, value),
          );
          select.multiple = original.multiple;
          if (opt.data) select.replaceChildren(...original.children);
          $select.removeData("treeSelection");
          if (--parentState.count === 0) {
            if (parentState.style === null) parent.removeAttribute("style");
            else parent.setAttribute("style", parentState.style);
            $(parent).removeData("treeSelectionParent");
          }
        },
      });
    });
  };
})(jQuery);
