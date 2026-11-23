// @vitest-environment jsdom
import "./define/multiSelect.js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MultiSelect from "./multiSelect.js";

beforeEach(() => {
    vi.useFakeTimers();
    HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
    document.body.replaceChildren();
    vi.useRealTimers();
});

/**
 * @param {(query: string) => Promise<import("./multiSelect.js").MultiSelectSearchResponse>} search
 * @param {boolean} [allowUnknown]
 */
async function setup(search, allowUnknown = false) {
    const field = new MultiSelect();
    field.search = search;
    field.allowUnknown = allowUnknown;
    document.body.append(field);
    await field.updateComplete;

    const input = field.renderRoot.querySelector("input");
    input.focus();

    function key(key, options = {}) {
        const event = new KeyboardEvent("keydown", {
            ...options,
            key,
            cancelable: true,
        });
        input.dispatchEvent(event);
        return event;
    }

    return {
        field,
        input,
        /** @param {string} query */
        type(query) {
            input.value = query;
            input.dispatchEvent(new Event("input"));
        },
        key,
        enter: () => key("Enter"),
        options() {
            return Array.from(
                field.renderRoot.querySelectorAll('[role="option"]'),
                (option) => option.textContent.trim()
            );
        },
        status: () =>
            field.renderRoot
                .querySelector('[role="status"]')
                ?.textContent.trim(),
        searchNow: () => vi.advanceTimersByTimeAsync(field.debounceMs),
    };
}

it.each([true, false])(
    "uses only the current query on fast Enter (allowUnknown: %s)",
    async (allowUnknown) => {
        const { field, input, type, enter, options, searchNow } = await setup(
            async (query) =>
                ["alpha", "beta"].filter((id) => id.startsWith(query)),
            allowUnknown
        );
        type("al");
        await searchNow();
        expect(options()).toEqual(["alpha"]);

        type("be");
        enter();
        await field.updateComplete;

        expect(field.value).toEqual(allowUnknown ? ["be"] : []);
        expect(input.hasAttribute("aria-activedescendant")).toBe(false);

        if (!allowUnknown) {
            expect(input.value).toBe("be");
            await searchNow();
            enter();
            expect(field.value).toEqual(["beta"]);
        }
    }
);

it("ignores a pending result when the query changes and then returns to the same text", async () => {
    const oldSearch = Promise.withResolvers();
    const search = vi
        .fn()
        .mockReturnValueOnce(oldSearch.promise)
        .mockResolvedValue(["alpha"]);
    const { type, options, searchNow } = await setup(search);
    type("al");
    await searchNow();
    expect(search).toHaveBeenCalledWith("al");

    type("be");
    type("al");
    // The old request finishes before the latest debounce timer fires.
    oldSearch.resolve(["alphabet"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(options()).toEqual([]);

    await searchNow();
    expect(options()).toEqual(["alpha"]);
});

it("shows labels for preset and chosen IDs and keeps the matching query", async () => {
    const search = vi.fn().mockResolvedValue([
        { id: "alpha-1", label: "Alpha", detail: "alpha-1" },
        { id: "alpha-2", label: "Alpha alternate", detail: "alpha-2" },
    ]);
    const { field, input, type, enter, options, searchNow } =
        await setup(search);
    field.keepQueryOnSelect = true;
    field.selectedValues = ["preset"];
    field.selectedLabels = { preset: "Saved choice" };
    const changed = vi.fn();
    field.addEventListener("change", changed);

    type("alpha");
    await searchNow();
    const option = field.renderRoot.querySelector('[role="option"]');
    expect(option.querySelector(".option-detail").textContent).toBe("alpha-1");
    enter();
    await field.updateComplete;

    expect(field.value).toEqual(["preset", "alpha-1"]);
    expect(changed.mock.calls[0][0].values).toEqual(["preset", "alpha-1"]);
    expect(
        Array.from(field.renderRoot.querySelectorAll(".pill-label"), (chip) =>
            chip.textContent.trim()
        )
    ).toEqual(["Saved choice", "Alpha"]);
    expect(input.value).toBe("alpha");
    expect(options()).toHaveLength(1);
    expect(options()[0]).toContain("Alpha alternate");
    expect(search).toHaveBeenCalledTimes(1);

    field.renderRoot
        .querySelector('[aria-label="Remove Alpha (alpha-1)"]')
        .click();
    await field.updateComplete;
    expect(options()).toHaveLength(2);
    expect(search).toHaveBeenCalledTimes(1);
});

it.each([false, true])(
    "handles multiline paste according to allowUnknown (%s)",
    async (allowUnknown) => {
        const { field, input } = await setup(
            async () => ["alpha"],
            allowUnknown
        );
        const paste = new Event("paste", { cancelable: true });
        Object.defineProperty(paste, "clipboardData", {
            value: { getData: () => "alpha\nbeta" },
        });
        input.dispatchEvent(paste);
        await field.updateComplete;

        expect(paste.defaultPrevented).toBe(allowUnknown);
        expect(field.value).toEqual(allowUnknown ? ["alpha", "beta"] : []);
    }
);

it("keeps App's exact-match delimiter and prefix checks", async () => {
    const { field, type, key, searchNow } = await setup(
        async () => ["Sample", "Sample name"],
        true
    );
    field.commitDelimiters = [",", " "];
    type("Sample");
    await searchNow();

    expect(key(" ").defaultPrevented).toBe(false);
    expect(field.value).toEqual([]);
    expect(key(",").defaultPrevented).toBe(true);
    expect(field.value).toEqual(["Sample"]);
});

it("keeps dismissed results closed until the user opens the popup again", async () => {
    const lookup = Promise.withResolvers();
    const { field, input, type, key, searchNow } = await setup(
        () => lookup.promise
    );
    type("alpha");
    await searchNow();
    expect(input.getAttribute("aria-busy")).toBe("true");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    key("Escape");
    lookup.resolve(["alpha"]);
    await vi.advanceTimersByTimeAsync(0);

    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(input.hasAttribute("aria-activedescendant")).toBe(false);
    key("Enter");
    expect(field.value).toEqual([]);

    key("ArrowDown");
    await searchNow();
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(input.hasAttribute("aria-activedescendant")).toBe(true);
});

it("waits for empty-query suggestions before opening on focus", async () => {
    const lookup = Promise.withResolvers();
    const search = vi.fn().mockReturnValue(lookup.promise);
    const { input, options, status, searchNow } = await setup(search);
    await searchNow();
    expect(search).toHaveBeenCalledWith("");
    expect(input.getAttribute("aria-expanded")).toBe("false");

    lookup.resolve(["Suggested choice"]);
    await vi.advanceTimersByTimeAsync(0);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(options()).toEqual(["Suggested choice"]);
    expect(status()).toBeUndefined();
});

it("shows visible, matching, and catalogue counts with a counted response", async () => {
    const totalItems = 1017;
    const { field, status, type, enter, searchNow } = await setup(
        async (query) => ({
            options: ["preset", "alpha", "beta", "gamma"],
            totalMatches: query ? 87 : totalItems,
            totalItems,
        })
    );
    field.selectedValues = ["preset"];
    field.maxSuggestions = 2;
    field.keepQueryOnSelect = true;

    await searchNow();
    const catalogue = `${totalItems.toLocaleString()} in catalogue`;
    expect(status()).toBe(`2 suggestions · ${catalogue}`);
    type("a");
    await searchNow();
    expect(status()).toBe(`Showing 2 of 87 matches · ${catalogue}`);

    enter();
    await field.updateComplete;
    enter();
    await field.updateComplete;
    expect(status()).toBe(`Showing 1 of 87 matches · ${catalogue}`);
});

it("can commit an exact match on blur from a counted response", async () => {
    const { field, input, type } = await setup(async () => ({
        options: [{ id: "alpha", label: "Alpha" }],
        totalMatches: 1,
    }));
    type("alpha");
    input.blur();
    await vi.advanceTimersByTimeAsync(0);
    expect(field.value).toEqual(["alpha"]);
});

it("keeps the popup closed when the empty query has no suggestions", async () => {
    const { input, type, searchNow } = await setup(async () => []);
    await searchNow();
    expect(input.getAttribute("aria-expanded")).toBe("false");

    type("no match");
    await searchNow();
    expect(input.getAttribute("aria-expanded")).toBe("true");
});

it("ignores a pending blur commit after the control is disabled", async () => {
    const lookup = Promise.withResolvers();
    const { field, input, type } = await setup(() => lookup.promise);
    type("alpha");
    input.blur();
    field.disabled = true;
    await field.updateComplete;
    lookup.resolve(["alpha"]);
    await vi.advanceTimersByTimeAsync(0);

    expect(field.value).toEqual([]);
});

it("lets the IME handle Enter while composing", async () => {
    const { field, type, key, searchNow } = await setup(async () => ["alpha"]);
    type("alpha");
    await searchNow();
    expect(key("Enter", { isComposing: true }).defaultPrevented).toBe(false);
    expect(field.value).toEqual([]);
});

it("keeps a new edit when a blur lookup finishes after refocusing", async () => {
    const blurLookup = Promise.withResolvers();
    const { field, input, type } = await setup(() => blurLookup.promise);
    type("alpha");
    input.blur();
    input.focus();
    type("be");

    blurLookup.resolve(["alpha"]);
    await vi.advanceTimersByTimeAsync(0);

    expect(field.value).toEqual([]);
    expect(input.value).toBe("be");
});
