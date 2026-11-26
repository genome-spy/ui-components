// @vitest-environment jsdom
import { afterEach, expect, test, vi } from "vitest";
import "./define/nativeSelect.js";

afterEach(() => document.body.replaceChildren());

/** Create a controlled picker with exact IDs distinct from its labels. */
function createControl() {
    const control = /** @type {import("./nativeSelect.js").default} */ (
        document.createElement("gs-native-select")
    );
    control.label = "Reference";
    control.placeholder = "Choose a reference";
    control.options = [
        { value: "lung-v1", label: "Lung" },
        {
            value: "blood-v1",
            label: "Blood",
            disabled: true,
            title: "Unavailable",
        },
    ];
    document.body.append(control);
    return control;
}

test("property updates retain IDs, placeholder and disabled metadata without emitting intent", async () => {
    const control = createControl();
    const change = vi.fn();
    control.addEventListener("change", change);
    await control.updateComplete;
    const select = control.shadowRoot.querySelector("select");
    const placeholder = select.querySelector('option[value=""]');
    expect(placeholder.hidden).toBe(true);
    expect(placeholder.disabled).toBe(true);
    expect(select.value).toBe("");
    expect(select.options[2].disabled).toBe(true);
    expect(select.options[2].title).toBe("Unavailable");

    control.value = "lung-v1";
    control.hideLabel = true;
    control.disabled = true;
    await control.updateComplete;
    expect(select.value).toBe("lung-v1");
    expect(select.disabled).toBe(true);
    expect(select.getAttribute("aria-label")).toBe("Reference");
    expect(control.shadowRoot.querySelector('[part="label"]').hidden).toBe(
        true
    );
    expect(change).not.toHaveBeenCalled();
});

test("a native user change crosses shadow roots once and a caller can restore its accepted ID", async () => {
    const parent = document.createElement("div");
    const outer = parent.attachShadow({ mode: "open" });
    document.body.append(parent);
    const control = createControl();
    outer.append(control);
    await control.updateComplete;
    const listener = vi.fn();
    parent.addEventListener("change", listener);
    const select = control.shadowRoot.querySelector("select");
    select.value = "lung-v1";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    expect(control.value).toBe("lung-v1");
    expect(listener).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({
            detail: { value: "lung-v1" },
            target: parent,
        })
    );

    control.value = "";
    await control.updateComplete;
    expect(select.value).toBe("");
    expect(listener).toHaveBeenCalledTimes(1);
});
