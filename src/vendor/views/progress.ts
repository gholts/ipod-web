import type {
  DomParent,
  TransitionFlag,
  Component,
  ComponentOptions,
  Invalidate,
} from "../runtime-types.js";
import type { ProgressProps } from "../view-types.js";
import { ProgressSlot } from "../slots.js";
import {
  SvelteComponent,
  append,
  appendStyles,
  attr,
  bubble,
  createEventDispatcher,
  createSvelteCustomElement,
  detach,
  element,
  flush,
  initComponent,
  insert,
  listen,
  noop,
  runAll,
  safeNotEqual,
  setStyle,
  space,
} from "../runtime.js";
import { progressCss } from "./styles.js";
type Context = ReturnType<typeof progressInstance>;
function progressStyles(root: DomParent) {
  appendStyles(root, "svelte-rmzg1t", progressCss);
}
function renderProgressFill(context: Context) {
  let progressFill: HTMLDivElement,
    dataTestidValue: string,
    value = `${context[ProgressSlot.percent]}%`;
  return {
    create() {
      progressFill = element("div");
      attr(progressFill, "class", "progress-fill svelte-rmzg1t");
      attr(
        progressFill,
        "data-testid",
        (dataTestidValue = context[ProgressSlot.testId] + "-fill"),
      );
      setStyle(progressFill, "width", value);
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, progressFill, anchor);
    },
    update(nextContext: Context, dirty: number) {
      if (
        dirty & (1 << ProgressSlot.testId) &&
        dataTestidValue !==
          (dataTestidValue = nextContext[ProgressSlot.testId] + "-fill")
      ) {
        attr(progressFill, "data-testid", dataTestidValue);
      }
      if (
        dirty & (1 << ProgressSlot.percent) &&
        value !== (value = `${nextContext[ProgressSlot.percent]}%`)
      ) {
        setStyle(progressFill, "width", value);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(progressFill);
      }
    },
  };
}
function renderProgressMarker(context: Context) {
  let progressMarker: HTMLDivElement,
    dataTestidValue: string,
    value = `${context[ProgressSlot.percent]}%`;
  return {
    create() {
      progressMarker = element("div");
      attr(progressMarker, "class", "progress-marker svelte-rmzg1t");
      attr(
        progressMarker,
        "data-testid",
        (dataTestidValue = context[ProgressSlot.testId] + "-marker"),
      );
      setStyle(progressMarker, "left", value);
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, progressMarker, anchor);
    },
    update(nextContext: Context, dirty: number) {
      if (
        dirty & (1 << ProgressSlot.testId) &&
        dataTestidValue !==
          (dataTestidValue = nextContext[ProgressSlot.testId] + "-marker")
      ) {
        attr(progressMarker, "data-testid", dataTestidValue);
      }
      if (
        dirty & (1 << ProgressSlot.percent) &&
        value !== (value = `${nextContext[ProgressSlot.percent]}%`)
      ) {
        setStyle(progressMarker, "left", value);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(progressMarker);
      }
    },
  };
}
function renderProgressInput(context: Context) {
  let rangeInput: HTMLInputElement, active: boolean, dispose: (() => void)[];
  return {
    create() {
      rangeInput = element("input");
      attr(rangeInput, "class", "range-input svelte-rmzg1t");
      attr(rangeInput, "type", "range");
      attr(rangeInput, "tabindex", "0");
      attr(rangeInput, "min", "0");
      attr(rangeInput, "max", context[ProgressSlot.max]);
      rangeInput.value = String(context[ProgressSlot.value]);
      rangeInput.disabled = context[ProgressSlot.disabled];
      attr(rangeInput, "aria-label", context[ProgressSlot.label]);
      attr(rangeInput, "aria-valuetext", context[ProgressSlot.valueText]);
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, rangeInput, anchor);
      if (!active) {
        dispose = [
          listen(rangeInput, "focus", context[ProgressSlot.forwardFocus]),
          listen(rangeInput, "input", context[ProgressSlot.handleInput]),
          listen(rangeInput, "change", context[ProgressSlot.forwardChange]),
          listen(rangeInput, "blur", context[ProgressSlot.forwardBlur]),
        ];
        active = true;
      }
    },
    update(nextContext: Context, dirty: number) {
      if (dirty & (1 << ProgressSlot.max)) {
        attr(rangeInput, "max", nextContext[ProgressSlot.max]);
      }
      if (dirty & (1 << ProgressSlot.value)) {
        rangeInput.value = String(nextContext[ProgressSlot.value]);
      }
      if (dirty & (1 << ProgressSlot.disabled)) {
        rangeInput.disabled = nextContext[ProgressSlot.disabled];
      }
      if (dirty & (1 << ProgressSlot.label)) {
        attr(rangeInput, "aria-label", nextContext[ProgressSlot.label]);
      }
      if (dirty & (1 << ProgressSlot.valueText)) {
        attr(rangeInput, "aria-valuetext", nextContext[ProgressSlot.valueText]);
      }
    },
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(rangeInput);
      }
      active = false;
      runAll(dispose);
    },
  };
}
function renderProgress(context: Context) {
  let progressBar: HTMLDivElement, spacer: Text, dataTestidValue: string;
  function selectBranch(context2: Context, dirty?: unknown) {
    return context2[ProgressSlot.variant] === "marker"
      ? renderProgressMarker
      : renderProgressFill;
  }
  let value = selectBranch(context),
    value2 = value(context),
    block:
      ReturnType<typeof renderProgressInput> | null | false | "" | undefined =
      context[ProgressSlot.label] && renderProgressInput(context);
  return {
    create() {
      progressBar = element("div");
      value2.create();
      spacer = space();
      if (block) {
        block.create();
      }
      attr(progressBar, "class", "progress-bar svelte-rmzg1t");
      attr(
        progressBar,
        "data-testid",
        (dataTestidValue = context[ProgressSlot.testId] + "-bar"),
      );
    },
    mount(target: DomParent, anchor: Node | null) {
      insert(target, progressBar, anchor);
      value2.mount(progressBar, null);
      append(progressBar, spacer);
      if (block) {
        block.mount(progressBar, null);
      }
    },
    update(nextContext: Context, [dirty]: number[]) {
      if (value === (value = selectBranch(nextContext)) && value2) {
        value2.update(nextContext, dirty);
      } else {
        value2.destroy(1);
        value2 = value(nextContext);
        if (value2) {
          value2.create();
          value2.mount(progressBar, spacer);
        }
      }
      if (nextContext[ProgressSlot.label]) {
        if (block) {
          block.update(nextContext, dirty);
        } else {
          block = renderProgressInput(nextContext);
          block.create();
          block.mount(progressBar, null);
        }
      } else if (block) {
        block.destroy(1);
        block = null;
      }
      if (
        dirty & 4 &&
        dataTestidValue !==
          (dataTestidValue = nextContext[ProgressSlot.testId] + "-bar")
      ) {
        attr(progressBar, "data-testid", dataTestidValue);
      }
    },
    intro: noop,
    outro: noop,
    destroy(detaching?: TransitionFlag) {
      if (detaching) {
        detach(progressBar);
      }
      value2.destroy();
      if (block) {
        block.destroy();
      }
    },
  };
}
function progressInstance(
  component: Component<unknown[], ProgressProps>,
  props: ProgressProps,
  invalidate: Invalidate,
) {
  let percent!: number,
    { value } = props,
    { max: max } = props,
    { testId } = props,
    { variant = "fill" } = props,
    { label = void 0 } = props,
    { valuetext: valueText = void 0 } = props,
    { disabled = false } = props;
  const dispatch = createEventDispatcher();
  function forwardFocus(this: HTMLElement, value2: Event) {
    bubble.call(this, component, value2);
  }
  function forwardChange(this: HTMLElement, value2: Event) {
    bubble.call(this, component, value2);
  }
  function forwardBlur(this: HTMLElement, value2: Event) {
    bubble.call(this, component, value2);
  }
  const handleInput = (
    value2: Event & {
      currentTarget: HTMLInputElement;
    },
  ) => dispatch("input", value2.currentTarget.valueAsNumber);
  component.$$set = (value2) => {
    if ("value" in value2) {
      invalidate(ProgressSlot.value, (value = value2.value!));
    }
    if ("max" in value2) {
      invalidate(ProgressSlot.max, (max = value2.max!));
    }
    if ("testId" in value2) {
      invalidate(ProgressSlot.testId, (testId = value2.testId!));
    }
    if ("variant" in value2) {
      invalidate(ProgressSlot.variant, (variant = value2.variant!));
    }
    if ("label" in value2) {
      invalidate(ProgressSlot.label, (label = value2.label!));
    }
    if ("valuetext" in value2) {
      invalidate(ProgressSlot.valueText, (valueText = value2.valuetext!));
    }
    if ("disabled" in value2) {
      invalidate(ProgressSlot.disabled, (disabled = value2.disabled!));
    }
  };
  component.$$.update = () => {
    if (
      component.$$.dirty[0] &
      ((1 << ProgressSlot.value) | (1 << ProgressSlot.max))
    ) {
      invalidate(
        ProgressSlot.percent,
        (percent = max > 0 ? Math.min(100, (value * 100) / max) : 0),
      );
    }
  };
  return [
    value,
    max,
    testId,
    variant,
    label,
    valueText,
    disabled,
    percent,
    dispatch,
    forwardFocus,
    forwardChange,
    forwardBlur,
    handleInput,
  ] satisfies [unknown, ...unknown[]];
}
class ProgressBar extends SvelteComponent<Context, ProgressProps> {
  constructor(options: ComponentOptions<ProgressProps>) {
    super();
    initComponent(
      this,
      options,
      progressInstance,
      renderProgress,
      safeNotEqual,
      {
        value: ProgressSlot.value,
        max: ProgressSlot.max,
        testId: ProgressSlot.testId,
        variant: ProgressSlot.variant,
        label: ProgressSlot.label,
        valuetext: ProgressSlot.valueText,
        disabled: ProgressSlot.disabled,
      },
      progressStyles,
    );
  }
  get value() {
    return this.$$.ctx[ProgressSlot.value]!;
  }
  set value(value: ProgressProps["value"]) {
    this.$$set!({
      value,
    });
    flush();
  }
  get max() {
    return this.$$.ctx[ProgressSlot.max]!;
  }
  set max(value: ProgressProps["max"]) {
    this.$$set!({
      max: value,
    });
    flush();
  }
  get testId() {
    return this.$$.ctx[ProgressSlot.testId]!;
  }
  set testId(testId: ProgressProps["testId"]) {
    this.$$set!({
      testId,
    });
    flush();
  }
  get variant() {
    return this.$$.ctx[ProgressSlot.variant]!;
  }
  set variant(variant: ProgressProps["variant"]) {
    this.$$set!({
      variant,
    });
    flush();
  }
  get label() {
    return this.$$.ctx[ProgressSlot.label]!;
  }
  set label(label: ProgressProps["label"]) {
    this.$$set!({
      label,
    });
    flush();
  }
  get valuetext() {
    return this.$$.ctx[ProgressSlot.valueText]!;
  }
  set valuetext(valuetext: ProgressProps["valuetext"]) {
    this.$$set!({
      valuetext,
    });
    flush();
  }
  get disabled() {
    return this.$$.ctx[ProgressSlot.disabled]!;
  }
  set disabled(disabled: ProgressProps["disabled"]) {
    this.$$set!({
      disabled,
    });
    flush();
  }
}
createSvelteCustomElement(
  ProgressBar,
  {
    value: {},
    max: {},
    testId: {},
    variant: {},
    label: {},
    valuetext: {},
    disabled: {
      type: "Boolean",
    },
  },
  [],
  [],
  true,
);
export { ProgressBar };
