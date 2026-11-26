import { html } from "lit";
import "@genome-spy/ui-components/define/appShell";
import "@genome-spy/ui-components/define/appToolbar";
import "@genome-spy/ui-components/define/taskSidebar";
import "@genome-spy/ui-components/define/dataEntry";
import "@genome-spy/ui-components/form.css";
import "@genome-spy/ui-components/contextMenu.css";

export default {
    title: "Components/Focused app layout",
    tags: ["autodocs"],
};

export const Workspace = {
    render: () => html`
        <gsa-app-shell style="height: 32rem" panel-side="left" compact-tasks>
            <gsa-app-toolbar
                slot="toolbar"
                app-title="Workspace"
                responsive
                task-drawer
            >
                <button>App command</button>
            </gsa-app-toolbar>
            <section slot="viewport">App-owned plot container</section>
            <gsa-task-sidebar
                slot="task-panel"
                .tabs=${[
                    { id: "review", label: "Review" },
                    { id: "settings", label: "Settings" },
                ]}
                active-id="review"
                @gsa-task-select=${(event) => {
                    event.currentTarget.activeId = event.detail.id;
                }}
            >
                <label slot="review"
                    >Label<input value="Retained draft"
                /></label>
                <section slot="settings">App-owned settings</section>
            </gsa-task-sidebar>
        </gsa-app-shell>
    `,
};

export const Entry = {
    render: () =>
        html`<gsa-data-entry
            style="height: 32rem"
            prompt="Drop a data file"
            accept=".csv"
            .examples=${[
                { id: "first", label: "First example" },
                { id: "second", label: "Second example" },
            ]}
        >
            <span slot="message">App-owned input validation</span>
        </gsa-data-entry>`,
};
