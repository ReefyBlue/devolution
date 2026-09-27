// Live tuning panel (F10): every profile field with the ranges from its spec. Changes apply while driving;
// Export saves a profile as its config/*.json file. Structural profiles are shown read-only, because the
// crane, the boxes and the key bindings are built from them at start.

import GUI from 'lil-gui';
import { PROFILE_FILES, type Profiles, type TestScene } from '../config/profiles';
import { PROFILE_SPECS, type ProfileName } from '../config/profileSpecs';
import type { ObjSpec, Spec } from '../config/spec';
import { TEST_SCENE_SPEC } from '../config/testSceneSpec';

const READ_ONLY_PROFILES: readonly ProfileName[] = ['crane', 'containers', 'palette', 'controls'];
/** Single fields that shape the built scene. */
const READ_ONLY_FIELDS: Partial<Record<ProfileName, readonly string[]>> = {
  boom: ['raisedAngle_deg'],
  spreader: ['headblockHeight_m', 'spreaderHeight_m'],
};

type Target = Record<string, unknown>;

export class TuningPanel {
  private readonly gui = new GUI({ title: 'QuayOps tuning · F10' });
  private visible = false;

  constructor(profiles: Profiles, scene: TestScene, onChange: () => void) {
    this.gui.hide();
    const names = Object.keys(PROFILE_SPECS) as ProfileName[];
    const live = names.filter((n) => !READ_ONLY_PROFILES.includes(n));
    for (const name of [...live, ...READ_ONLY_PROFILES]) {
      const readOnly = READ_ONLY_PROFILES.includes(name);
      const folder = this.gui.addFolder(`${PROFILE_FILES[name]}${readOnly ? ' (read-only)' : ''}`).close();
      addFields(folder, PROFILE_SPECS[name], profiles[name] as Target, onChange, readOnly ? null : (READ_ONLY_FIELDS[name] ?? []));
      addExport(folder, PROFILE_FILES[name], profiles[name]);
    }
    const wind = this.gui.addFolder('wind (test scene)').close();
    addFields(wind, TEST_SCENE_SPEC.fields.wind, scene.wind as Target, onChange, ['seed']);
  }

  toggle(): void {
    this.visible = !this.visible;
    this.gui.show(this.visible);
  }
}

/** Adds one controller per field; `readOnly` null = the whole object is read-only. */
function addFields(folder: GUI, spec: ObjSpec, target: Target, onChange: () => void, readOnly: readonly string[] | null): void {
  for (const [key, field] of Object.entries(spec.fields)) {
    const locked = readOnly === null || readOnly.includes(key);
    const value = target[key];
    if (field.kind === 'object' || field.kind === 'map') {
      const sub = folder.addFolder(key).close();
      const entries = field.kind === 'object' ? field : { kind: 'object' as const, fields: mapFields(field.value, value as Target) };
      addFields(sub, entries, value as Target, onChange, locked ? null : []);
      continue;
    }
    let c;
    if (field.kind === 'number') c = folder.add(target, key, field.min, field.max, field.step).name(field.unit ? `${key} (${field.unit})` : key);
    else if (field.kind === 'integer') c = folder.add(target, key, field.min, field.max, 1);
    else if (field.kind === 'enum') c = folder.add(target, key, [...field.values]);
    else if (field.kind === 'boolean') c = folder.add(target, key);
    else c = folder.add({ [key]: Array.isArray(value) ? value.join(', ') : String(value) }, key);
    if (locked || field.kind === 'text' || field.kind === 'list') c.disable();
    else c.onChange(onChange);
  }
}

/** A map's entries as object fields, all with the map's value spec. */
function mapFields(value: Spec, target: Target): Record<string, Spec> {
  return Object.fromEntries(Object.keys(target).map((k) => [k, value]));
}

function addExport(folder: GUI, file: string, profile: unknown): void {
  const json = (): string => `${JSON.stringify(profile, null, 2)}\n`;
  folder.add(
    {
      export: (): void => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
        a.download = file;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      },
    },
    'export',
  ).name(`Export ${file}`);
  const copy = (): void => {
    const text = json();
    const written = navigator.clipboard?.writeText(text);
    if (written) written.catch(() => showJson(file, text));
    else showJson(file, text);
  };
  folder.add({ copy }, 'copy').name('Copy JSON');
}

/** Where the clipboard is refused: the JSON in a box, selected, to copy by hand. */
function showJson(file: string, text: string): void {
  const box = document.createElement('div');
  box.className = 'json-box';
  const label = document.createElement('label');
  label.htmlFor = 'json-box-text';
  label.textContent = `${file}: the clipboard is blocked here. Press Ctrl+C (⌘C) to copy the selected text.`;
  const area = document.createElement('textarea');
  area.id = 'json-box-text';
  area.readOnly = true;
  area.value = text;
  const close = document.createElement('button');
  close.type = 'button';
  close.textContent = 'Close';
  close.addEventListener('click', () => box.remove());
  box.append(label, area, close);
  document.body.append(box);
  area.focus();
  area.select();
}
