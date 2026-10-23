import type * as Model from "../../types.js";
import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { ListProps } from "../view-types.js";
import { ListSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  arrayLike,
  createEventDispatcher,
  createSvelteCustomElement,
  destroyEach,
  detach,
  element,
  flush,
  actionDestroyer,
  initComponent,
  insert,
  isFunction,
  noop,
  runAll,
  safeNotEqual,
  setData,
  space,
  subscribeComponent,
  text,
  toggleClass,
} from "../runtime.js";
import { settings } from "../settings.js";
import { focusWhenRequested, settingLabel, useI18n } from "../i18n.js";
import { listCss } from "./styles.js";
type Context = ReturnType<typeof menuListInstance>;
type RowContext = [...Context, undefined, Model.MenuRow, undefined, number];
function listStyles(root: DomParent) {
  appendStyles(root, "svelte-v01lnd", listCss);
}
function rowContext(
  context: Context,
  items: ArrayLike<Model.MenuRow>,
  index: number,
): RowContext {
  const row = context.slice() as RowContext;
  row[10] = items[index];
  row[12] = index;
  return row;
}
function renderChevron(context: RowContext) {
  let chevron: HTMLSpanElement;
  return {
    create() {
      chevron = element("span");
      attr(chevron, "class", "chevron svelte-v01lnd");
      attr(chevron, "data-testid", "chevron");
      attr(chevron, "aria-hidden", "true");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, chevron, anchor);
    },
    update: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(chevron);
      }
    },
  };
}
function renderToggleValue(context: RowContext) {
  let itemValue: HTMLSpanElement,
    label =
      settingLabel(
        context[ListSlot.currentSettings][
          (
            context[ListSlot.item] as Extract<
              Model.MenuRow,
              {
                action: "inline-toggle";
              }
            >
          ).toggleKey
        ],
        context[ListSlot.translations],
      ) + "",
    textNode: Text;
  return {
    create() {
      itemValue = element("span");
      textNode = text(label);
      attr(itemValue, "class", "item-value svelte-v01lnd");
      attr(itemValue, "data-testid", "item-value");
      attr(itemValue, "dir", "auto");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, itemValue, anchor);
      append(itemValue, textNode);
    },
    update(nextContext: RowContext, dirty: number) {
      if (
        dirty &
          ((1 << ListSlot.items) |
            (1 << ListSlot.currentSettings) |
            (1 << ListSlot.translations)) &&
        label !==
          (label =
            settingLabel(
              nextContext[ListSlot.currentSettings][
                (
                  nextContext[ListSlot.item] as Extract<
                    Model.MenuRow,
                    {
                      action: "inline-toggle";
                    }
                  >
                ).toggleKey
              ],
              nextContext[ListSlot.translations],
            ) + "")
      ) {
        setData(textNode, label);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(itemValue);
      }
    },
  };
}
function renderInfoValue(context: RowContext) {
  let itemValue: HTMLSpanElement,
    label = context[ListSlot.item].value + "",
    textNode: Text;
  return {
    create() {
      itemValue = element("span");
      textNode = text(label);
      attr(itemValue, "class", "item-value svelte-v01lnd");
      attr(itemValue, "data-testid", "item-value");
      attr(itemValue, "dir", "auto");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, itemValue, anchor);
      append(itemValue, textNode);
    },
    update(nextContext: RowContext, dirty: number) {
      if (
        dirty & (1 << ListSlot.items) &&
        label !== (label = nextContext[ListSlot.item].value + "")
      ) {
        setData(textNode, label);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(itemValue);
      }
    },
  };
}
function renderRow(context: RowContext) {
  let menuItem: HTMLLIElement,
    itemTitle: HTMLSpanElement,
    label = context[ListSlot.item].title + "",
    textNode: Text,
    spacer: Text,
    spacer2: Text,
    idValue: string,
    dataActionValue: Model.MenuRow["action"],
    roleValue: string | undefined,
    ariaSelectedValue: boolean | undefined,
    scrollAction: ReturnType<typeof scrollSelectedIntoView>,
    listening: boolean,
    dispose: () => void;
  function selectBranch(context2: RowContext, dirty?: unknown) {
    if (
      context2[ListSlot.item].action === "info" &&
      context2[ListSlot.item].value
    )
      return renderInfoValue;
    if (context2[ListSlot.item].action === "inline-toggle")
      return renderToggleValue;
    if (context2[ListSlot.item].action === "navigate") return renderChevron;
  }
  let renderAccessory = selectBranch(context),
    accessory = renderAccessory && renderAccessory(context);
  return {
    create() {
      menuItem = element("li");
      itemTitle = element("span");
      textNode = text(label);
      spacer = space();
      if (accessory) {
        accessory.create();
      }
      spacer2 = space();
      attr(itemTitle, "class", "item-title svelte-v01lnd");
      attr(itemTitle, "data-testid", "item-title");
      attr(itemTitle, "dir", "auto");
      attr(
        menuItem,
        "id",
        (idValue = `menu-item-${context[ListSlot.navigationId]}-${context[ListSlot.index]}`),
      );
      attr(menuItem, "class", "menu-item svelte-v01lnd");
      attr(menuItem, "data-testid", "menu-item");
      attr(
        menuItem,
        "data-action",
        (dataActionValue = context[ListSlot.item].action),
      );
      attr(
        menuItem,
        "role",
        (roleValue =
          context[ListSlot.item].action === "info" ? void 0 : "option"),
      );
      attr(
        menuItem,
        "aria-selected",
        (ariaSelectedValue =
          context[ListSlot.item].action === "info"
            ? void 0
            : context[ListSlot.index] === context[ListSlot.selectedIndex]),
      );
      toggleClass(
        menuItem,
        "selected",
        context[ListSlot.index] === context[ListSlot.selectedIndex],
      );
      toggleClass(
        menuItem,
        "centered",
        context[ListSlot.item].action === "info" &&
          context[ListSlot.item].centered,
      );
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, menuItem, anchor);
      append(menuItem, itemTitle);
      append(itemTitle, textNode);
      append(menuItem, spacer);
      if (accessory) {
        accessory.mount(menuItem, null);
      }
      append(menuItem, spacer2);
      if (!listening) {
        dispose = actionDestroyer(
          (scrollAction = scrollSelectedIntoView.call(
            null,
            menuItem,
            context[ListSlot.index] === context[ListSlot.selectedIndex],
          )),
        );
        listening = true;
      }
    },
    update(nextContext: RowContext, dirty: number) {
      context = nextContext;
      if (
        dirty & (1 << ListSlot.items) &&
        label !== (label = context[ListSlot.item].title + "")
      ) {
        setData(textNode, label);
      }
      if (
        renderAccessory === (renderAccessory = selectBranch(context)) &&
        accessory
      ) {
        accessory.update(context, dirty);
      } else {
        if (accessory) {
          accessory.destroy(1);
        }
        accessory = renderAccessory && renderAccessory(context);
        if (accessory) {
          accessory.create();
          accessory.mount(menuItem, spacer2);
        }
      }
      if (
        dirty & (1 << ListSlot.navigationId) &&
        idValue !==
          (idValue = `menu-item-${context[ListSlot.navigationId]}-${context[ListSlot.index]}`)
      ) {
        attr(menuItem, "id", idValue);
      }
      if (
        dirty & (1 << ListSlot.items) &&
        dataActionValue !== (dataActionValue = context[ListSlot.item].action)
      ) {
        attr(menuItem, "data-action", dataActionValue);
      }
      if (
        dirty & (1 << ListSlot.items) &&
        roleValue !==
          (roleValue =
            context[ListSlot.item].action === "info" ? void 0 : "option")
      ) {
        attr(menuItem, "role", roleValue);
      }
      if (
        dirty & ((1 << ListSlot.items) | (1 << ListSlot.selectedIndex)) &&
        ariaSelectedValue !==
          (ariaSelectedValue =
            context[ListSlot.item].action === "info"
              ? void 0
              : context[ListSlot.index] === context[ListSlot.selectedIndex])
      ) {
        attr(menuItem, "aria-selected", ariaSelectedValue);
      }
      if (
        scrollAction &&
        isFunction(scrollAction.update) &&
        dirty & (1 << ListSlot.selectedIndex)
      ) {
        scrollAction.update.call(
          null,
          context[ListSlot.index] === context[ListSlot.selectedIndex],
        );
      }
      if (dirty & (1 << ListSlot.selectedIndex)) {
        toggleClass(
          menuItem,
          "selected",
          context[ListSlot.index] === context[ListSlot.selectedIndex],
        );
      }
      if (dirty & (1 << ListSlot.items)) {
        toggleClass(
          menuItem,
          "centered",
          context[ListSlot.item].action === "info" &&
            context[ListSlot.item].centered,
        );
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(menuItem);
      }
      if (accessory) {
        accessory.destroy();
      }
      listening = false;
      dispose();
    },
  };
}
function renderList(context: Context) {
  let menuItems: HTMLUListElement,
    ariaActivedescendantValue: string,
    listening: boolean,
    dispose: (() => void)[],
    items = arrayLike(context[ListSlot.items]),
    blocks = [];
  for (let index = 0; index < items.length; index += 1)
    blocks[index] = renderRow(rowContext(context, items, index));
  return {
    create() {
      menuItems = element("ul");
      for (let index = 0; index < blocks.length; index += 1)
        blocks[index].create();
      attr(menuItems, "class", "menu-items svelte-v01lnd");
      attr(menuItems, "data-testid", "menu-items");
      attr(menuItems, "role", "listbox");
      attr(menuItems, "tabindex", "0");
      attr(
        menuItems,
        "aria-activedescendant",
        (ariaActivedescendantValue = `menu-item-${context[ListSlot.navigationId]}-${context[ListSlot.selectedIndex]}`),
      );
      attr(menuItems, "aria-labelledby", "menu-title");
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, menuItems, anchor);
      for (let index = 0; index < blocks.length; index += 1)
        if (blocks[index]) {
          blocks[index]!.mount(menuItems, null);
        }
      if (!listening) {
        focusWhenRequested.call(null, menuItems, context[ListSlot.shouldFocus]);
        dispose = [
          actionDestroyer(
            context[ListSlot.restoreListScroll].call(
              null,
              menuItems,
              context[ListSlot.restoredScrollTop],
            ),
          ),
        ];
        listening = true;
      }
    },
    update(nextContext: Context, [dirty]: number[]) {
      if (dirty & 103) {
        items = arrayLike(nextContext[ListSlot.items]);
        let index: number;
        for (index = 0; index < items.length; index += 1) {
          const value5 = rowContext(nextContext, items, index);
          if (blocks[index]) {
            blocks[index]!.update(value5, dirty);
          } else {
            blocks[index] = renderRow(value5);
            blocks[index].create();
            blocks[index]!.mount(menuItems, null);
          }
        }
        for (; index < blocks.length; index += 1) blocks[index]!.destroy(1);
        blocks.length = items.length;
      }
      if (
        dirty & 6 &&
        ariaActivedescendantValue !==
          (ariaActivedescendantValue = `menu-item-${nextContext[ListSlot.navigationId]}-${nextContext[ListSlot.selectedIndex]}`)
      ) {
        attr(menuItems, "aria-activedescendant", ariaActivedescendantValue);
      }
    },
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(menuItems);
      }
      destroyEach(blocks, detaching);
      listening = false;
      runAll(dispose);
    },
  };
}
function scrollSelectedIntoView(node: HTMLElement, selected: boolean) {
  if (selected) {
    node.scrollIntoView({
      block: "nearest",
    });
  }
  return {
    update(nextContext: boolean) {
      if (nextContext) {
        node.scrollIntoView({
          block: "nearest",
        });
      }
    },
  };
}
function menuListInstance(
  component: Component<unknown[], ListProps>,
  props: ListProps,
  invalidate: Invalidate,
) {
  let currentSettings!: Model.Settings, translations!: Model.I18n;
  subscribeComponent(component, settings, (value) =>
    invalidate(ListSlot.currentSettings, (currentSettings = value)),
  );
  const i18n = useI18n();
  subscribeComponent(component, i18n, (value) =>
    invalidate(ListSlot.translations, (translations = value)),
  );
  const dispatch = createEventDispatcher();
  let { items } = props,
    { selectedIndex } = props,
    { navigationId } = props,
    { shouldFocus } = props,
    { restoredScrollTop = void 0 } = props;
  function restoreListScroll(node: HTMLElement, scrollTop: number | undefined) {
    dispatch("listmount", node);
    if (scrollTop !== void 0) {
      node.scrollTop = scrollTop;
    }
    return {
      destroy() {
        dispatch("listunmount", node);
      },
    };
  }
  component.$$set = (value) => {
    if ("items" in value) {
      invalidate(ListSlot.items, (items = value.items!));
    }
    if ("selectedIndex" in value) {
      invalidate(
        ListSlot.selectedIndex,
        (selectedIndex = value.selectedIndex!),
      );
    }
    if ("navigationId" in value) {
      invalidate(ListSlot.navigationId, (navigationId = value.navigationId!));
    }
    if ("shouldFocus" in value) {
      invalidate(ListSlot.shouldFocus, (shouldFocus = value.shouldFocus!));
    }
    if ("restoredScrollTop" in value) {
      invalidate(
        ListSlot.restoredScrollTop,
        (restoredScrollTop = value.restoredScrollTop!),
      );
    }
  };
  return [
    items,
    selectedIndex,
    navigationId,
    shouldFocus,
    restoredScrollTop,
    currentSettings,
    translations,
    i18n,
    restoreListScroll,
  ] satisfies [unknown, ...unknown[]];
}
class MenuList extends SvelteComponent<Context, ListProps> {
  constructor(options: ComponentOptions<ListProps>) {
    super();
    initComponent(
      this,
      options,
      menuListInstance,
      renderList,
      safeNotEqual,
      {
        items: ListSlot.items,
        selectedIndex: ListSlot.selectedIndex,
        navigationId: ListSlot.navigationId,
        shouldFocus: ListSlot.shouldFocus,
        restoredScrollTop: ListSlot.restoredScrollTop,
      },
      listStyles,
    );
  }
  get items() {
    return this.$$.ctx[ListSlot.items]!;
  }
  set items(items: ListProps["items"]) {
    this.$$set!({
      items,
    });
    flush();
  }
  get selectedIndex() {
    return this.$$.ctx[ListSlot.selectedIndex]!;
  }
  set selectedIndex(selectedIndex: ListProps["selectedIndex"]) {
    this.$$set!({
      selectedIndex,
    });
    flush();
  }
  get navigationId() {
    return this.$$.ctx[ListSlot.navigationId]!;
  }
  set navigationId(navigationId: ListProps["navigationId"]) {
    this.$$set!({
      navigationId,
    });
    flush();
  }
  get shouldFocus() {
    return this.$$.ctx[ListSlot.shouldFocus]!;
  }
  set shouldFocus(shouldFocus: ListProps["shouldFocus"]) {
    this.$$set!({
      shouldFocus,
    });
    flush();
  }
  get restoredScrollTop() {
    return this.$$.ctx[ListSlot.restoredScrollTop]!;
  }
  set restoredScrollTop(restoredScrollTop: ListProps["restoredScrollTop"]) {
    this.$$set!({
      restoredScrollTop,
    });
    flush();
  }
}
createSvelteCustomElement(
  MenuList,
  {
    items: {},
    selectedIndex: {},
    navigationId: {},
    shouldFocus: {},
    restoredScrollTop: {},
  },
  [],
  [],
  true,
);
export { MenuList };
