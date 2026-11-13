import { useState } from "react";
import { useRevalidator } from "react-router";
import { readDemo, writeDemo, type DemoState } from "../api/mock";
import type { FlagName, OrgSettings, Role } from "../capabilities/types";
import { invalidateCapabilities } from "../middleware/capabilities";

const ROLES: Role[] = ["viewer", "editor", "admin", "owner"];
const FLAGS: FlagName[] = ["newReports", "aiAssistant"];
const PLANS: OrgSettings["plan"][] = ["free", "pro", "enterprise"];

/** Simulates a backend change. Invalidate the cache, then revalidate so middleware re-runs. */
export function DevPanel() {
  const [s, setS] = useState<DemoState>(readDemo);
  const { revalidate } = useRevalidator();

  const update = (patch: Partial<DemoState>) => {
    const next = { ...s, ...patch };
    setS(next);
    writeDemo(next);
    invalidateCapabilities();
    revalidate();
  };

  return (
    <aside style={{ border: "1px dashed #999", padding: 12, marginTop: 24, fontSize: 14 }}>
      <strong>Dev panel (fake backend)</strong>
      <div>
        Role:{" "}
        {ROLES.map((r) => (
          <label key={r} style={{ marginRight: 8 }}>
            <input type="radio" checked={s.roles[0] === r} onChange={() => update({ roles: [r] })} /> {r}
          </label>
        ))}
      </div>
      <div>
        Flags:{" "}
        {FLAGS.map((f) => (
          <label key={f} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={s.flags[f]}
              onChange={(e) => update({ flags: { ...s.flags, [f]: e.target.checked } })}
            />{" "}
            {f}
          </label>
        ))}
      </div>
      <div>
        Org plan:{" "}
        <select value={s.org.plan} onChange={(e) => update({ org: { ...s.org, plan: e.target.value as OrgSettings["plan"] } })}>
          {PLANS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>{" "}
        <label>
          <input
            type="checkbox"
            checked={s.org.billingEnabled}
            onChange={(e) => update({ org: { ...s.org, billingEnabled: e.target.checked } })}
          />{" "}
          billingEnabled
        </label>{" "}
        <label>
          <input
            type="checkbox"
            checked={s.org.ssoEnabled}
            onChange={(e) => update({ org: { ...s.org, ssoEnabled: e.target.checked } })}
          />{" "}
          ssoEnabled
        </label>
      </div>
    </aside>
  );
}
