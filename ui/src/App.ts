import { request, importDevice, removeDevice, saveScanSubnet } from './api';
import type { DeviceType, UiDevice } from './types';

export function App(): string {
  return `
    <div class="container">

      <h1>Homebridge Tasmota Local</h1>

      <div class="subnet-row">
        <label for="scanSubnetInput">Scan Subnet</label>
        <input
          id="scanSubnetInput"
          type="text"
          placeholder="10.0.1"
          autocomplete="off"
        />
        <button id="saveSubnetButton">Save</button>
      </div>

      <button id="scanButton">
        Scan Network
      </button>

      <div id="results">
        <p class="empty">No scan performed.</p>
      </div>

    </div>
  `;
}

function statusBadge(configured: boolean): HTMLElement {

  const status = document.createElement('span');
  status.className = `status ${configured ? 'configured' : 'pending'}`;
  status.textContent = configured ? '✓ Configured' : 'Available to import';

  return status;
}

function deviceInfo(device: UiDevice): HTMLElement {

  const info = document.createElement('div');
  info.className = 'device-info';

  const name = document.createElement('span');
  name.className = 'device-name';
  name.textContent = device.name;

  const ip = document.createElement('span');
  ip.className = 'device-ip';
  ip.textContent = device.host;

  info.appendChild(name);
  info.appendChild(ip);
  info.appendChild(statusBadge(device.configured));

  return info;
}

/**
 * Light/Switch picker for an unconfigured row. Lives outside the row's
 * <label> (see deviceRow) so clicking it doesn't also toggle the import
 * checkbox the way clicking anywhere else in the label does.
 */
function typeToggle(checkbox: HTMLInputElement): HTMLElement {

  const toggle = document.createElement('div');
  toggle.className = 'type-toggle';

  const options: { value: DeviceType; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'switch', label: 'Switch' },
  ];

  const buttons = options.map(({ value, label }) => {

    const optionButton = document.createElement('button');
    optionButton.type = 'button';
    optionButton.textContent = label;
    optionButton.dataset.value = value;
    optionButton.setAttribute(
      'aria-pressed',
      String(checkbox.dataset.type === value),
    );
    optionButton.classList.toggle(
      'active',
      checkbox.dataset.type === value,
    );

    optionButton.addEventListener('click', () => {

      checkbox.dataset.type = value;

      toggle.querySelectorAll('button').forEach(button => {
        const isActive = button === optionButton;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
      });
    });

    return optionButton;
  });

  buttons.forEach(button => toggle.appendChild(button));

  return toggle;
}

function deviceRow(device: UiDevice): HTMLElement {

  const row = document.createElement('div');
  row.className = 'device';

  if (device.configured) {

    row.classList.add('configured-row');
    row.appendChild(deviceInfo(device));

    const removeToggle = document.createElement('button');
    removeToggle.className = 'removeToggle';
    removeToggle.textContent = 'Remove';
    removeToggle.dataset.host = device.host;
    removeToggle.dataset.name = device.name;

    row.appendChild(removeToggle);

    return row;
  }

  row.classList.add('unconfigured-row');

  // The checkbox + info live in their own <label> so clicking the name/IP
  // toggles the checkbox; the type toggle sits outside it (see typeToggle).
  const selectLabel = document.createElement('label');
  selectLabel.className = 'device-select';

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'importCheckbox';
  checkbox.dataset.host = device.host;
  checkbox.dataset.name = device.name;
  checkbox.dataset.type = device.suggestedType;

  selectLabel.appendChild(checkbox);
  selectLabel.appendChild(deviceInfo(device));

  row.appendChild(selectLabel);
  row.appendChild(typeToggle(checkbox));

  return row;
}

function buildControls(unconfiguredCount: number): HTMLElement {

  const controls = document.createElement('div');
  controls.className = 'controls';

  const selectAllWrapper = document.createElement('label');
  selectAllWrapper.className = 'select-all';

  const selectAll = document.createElement('input');
  selectAll.type = 'checkbox';
  selectAll.id = 'selectAllCheckbox';
  selectAll.disabled = unconfiguredCount === 0;

  const selectAllText = document.createElement('span');
  selectAllText.textContent = 'Select all';

  selectAllWrapper.appendChild(selectAll);
  selectAllWrapper.appendChild(selectAllText);

  controls.appendChild(selectAllWrapper);

  return controls;
}

function buildApplyBar(): HTMLElement {

  const bar = document.createElement('div');
  bar.className = 'apply-bar';

  const applyButton = document.createElement('button');
  applyButton.id = 'applyChangesButton';
  applyButton.className = 'primary';
  applyButton.textContent = 'Apply Changes';
  applyButton.disabled = true;

  bar.appendChild(applyButton);

  return bar;
}

/**
 * An in-page confirmation instead of window.confirm(): Homebridge UI loads
 * this custom UI in a sandboxed iframe, and native confirm()/alert() dialogs
 * can be silently blocked there with no error and no visible prompt - which
 * just looks like the button doing nothing.
 */
function buildConfirmPanel(
  removals: HTMLButtonElement[],
  onConfirm: () => void,
  onCancel: () => void,
): HTMLElement {

  const panel = document.createElement('div');
  panel.className = 'confirm-panel';

  const message = document.createElement('p');
  message.className = 'confirm-message';
  message.textContent =
    `Remove ${removals.length} device${removals.length === 1 ? '' : 's'}?`;
  panel.appendChild(message);

  const list = document.createElement('ul');
  list.className = 'confirm-list';

  removals.forEach(button => {
    const item = document.createElement('li');
    item.textContent = button.dataset.name ?? '';
    list.appendChild(item);
  });

  panel.appendChild(list);

  const note = document.createElement('p');
  note.className = 'confirm-note';
  note.textContent =
    'They will disappear from HomeKit after the next Homebridge restart.';
  panel.appendChild(note);

  const actions = document.createElement('div');
  actions.className = 'confirm-actions';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.addEventListener('click', onCancel);

  const proceedButton = document.createElement('button');
  proceedButton.type = 'button';
  proceedButton.className = 'primary';
  proceedButton.textContent = 'Yes, apply changes';
  proceedButton.addEventListener('click', onConfirm);

  actions.appendChild(cancelButton);
  actions.appendChild(proceedButton);
  panel.appendChild(actions);

  return panel;
}

function importCheckboxes(results: HTMLElement): HTMLInputElement[] {
  return Array.from(
    results.querySelectorAll<HTMLInputElement>('.importCheckbox:not(:disabled)'),
  );
}

function markedForRemoval(results: HTMLElement): HTMLButtonElement[] {
  return Array.from(
    results.querySelectorAll<HTMLButtonElement>('.removeToggle.marked'),
  );
}

function updateControls(results: HTMLElement): void {

  const checkboxes = importCheckboxes(results);
  const checked = checkboxes.filter(checkbox => checkbox.checked);
  const removals = markedForRemoval(results);

  const selectAll =
    results.querySelector<HTMLInputElement>('#selectAllCheckbox');

  if (selectAll) {
    selectAll.checked =
      checkboxes.length > 0 && checked.length === checkboxes.length;
    selectAll.indeterminate =
      checked.length > 0 && checked.length < checkboxes.length;
  }

  const applyButton =
    results.querySelector<HTMLButtonElement>('#applyChangesButton');

  if (!applyButton) {
    return;
  }

  const parts: string[] = [];

  if (checked.length > 0) {
    parts.push(`import ${checked.length}`);
  }

  if (removals.length > 0) {
    parts.push(`remove ${removals.length}`);
  }

  applyButton.textContent =
    parts.length > 0 ? `Apply Changes (${parts.join(', ')})` : 'Apply Changes';

  applyButton.disabled = parts.length === 0;
}

function toggleRemoveMark(button: HTMLButtonElement, results: HTMLElement): void {

  const marked = button.classList.toggle('marked');
  button.textContent = marked ? 'Undo' : 'Remove';

  const statusEl = button
    .closest('.device')
    ?.querySelector<HTMLElement>('.status');

  if (statusEl) {
    if (marked) {
      statusEl.dataset.previousText = statusEl.textContent ?? '';
      statusEl.className = 'status marked-removal';
      statusEl.textContent = 'Marked for removal';
    } else {
      statusEl.className = 'status configured';
      statusEl.textContent = statusEl.dataset.previousText ?? '✓ Configured';
    }
  }

  updateControls(results);
}

function handleApplyClick(results: HTMLElement): void {

  const applyButton =
    results.querySelector<HTMLButtonElement>('#applyChangesButton');

  const bar = results.querySelector<HTMLElement>('.apply-bar');

  const checkboxes = importCheckboxes(results).filter(
    checkbox => checkbox.checked,
  );

  const removals = markedForRemoval(results);

  if (!applyButton || !bar || (checkboxes.length === 0 && removals.length === 0)) {
    return;
  }

  if (removals.length === 0) {
    applyChanges(results);
    return;
  }

  const panel = buildConfirmPanel(
    removals,
    () => {
      panel.remove();
      applyButton.hidden = false;
      applyChanges(results);
    },
    () => {
      panel.remove();
      applyButton.hidden = false;
    },
  );

  applyButton.hidden = true;
  bar.appendChild(panel);
}

async function applyChanges(results: HTMLElement): Promise<void> {

  const applyButton =
    results.querySelector<HTMLButtonElement>('#applyChangesButton');

  const checkboxes = importCheckboxes(results).filter(
    checkbox => checkbox.checked,
  );

  const removals = markedForRemoval(results);

  if (!applyButton || (checkboxes.length === 0 && removals.length === 0)) {
    return;
  }

  const selectAll =
    results.querySelector<HTMLInputElement>('#selectAllCheckbox');

  applyButton.disabled = true;

  if (selectAll) {
    selectAll.disabled = true;
  }

  const total = checkboxes.length + removals.length;
  let done = 0;

  for (const checkbox of checkboxes) {

    const host = checkbox.dataset.host ?? '';
    const name = checkbox.dataset.name ?? '';
    const type = (checkbox.dataset.type as DeviceType | undefined) ?? 'light';
    const row = checkbox.closest('.device');
    const statusEl = row?.querySelector<HTMLElement>('.status');

    applyButton.textContent = `Applying ${done}/${total}...`;

    try {

      const result = await importDevice(host, name, type);

      if (statusEl) {
        statusEl.className = 'status configured';
        statusEl.textContent =
          result === 'imported' ? '✓ Imported' : '✓ Already configured';
      }

      row?.classList.remove('unconfigured-row');
      checkbox.checked = false;
      checkbox.disabled = true;
      checkbox.hidden = true;
      row?.querySelector('.type-toggle')?.remove();

    } catch (error) {

      console.error(error);

      window.homebridge?.toast?.error(
        error instanceof Error ? error.message : String(error),
        `Import failed: ${name}`,
      );

    } finally {
      done++;
    }
  }

  for (const removeToggle of removals) {

    const host = removeToggle.dataset.host ?? '';
    const name = removeToggle.dataset.name ?? '';
    const row = removeToggle.closest('.device');

    applyButton.textContent = `Applying ${done}/${total}...`;

    try {

      await removeDevice(host);

      row?.replaceWith(
        deviceRow({ name, host, configured: false, suggestedType: 'light' }),
      );

    } catch (error) {

      console.error(error);

      window.homebridge?.toast?.error(
        error instanceof Error ? error.message : String(error),
        `Remove failed: ${name}`,
      );

    } finally {
      done++;
    }
  }

  if (selectAll) {
    selectAll.disabled = importCheckboxes(results).length === 0;
  }

  updateControls(results);
}

async function loadScanSubnet(input: HTMLInputElement): Promise<void> {

  try {

    const config = await request<{ scanSubnet: string | null }>('/config');

    if (config.scanSubnet) {
      input.value = config.scanSubnet;
    }

  } catch (error) {
    console.error(error);
  }
}

async function handleSaveSubnet(
  input: HTMLInputElement,
  saveButton: HTMLButtonElement,
): Promise<void> {

  const subnet = input.value.trim();

  if (!subnet) {
    window.homebridge?.toast?.error(
      'Enter a subnet first, e.g. 10.0.1',
      'Scan subnet',
    );
    return;
  }

  saveButton.disabled = true;
  saveButton.textContent = 'Saving...';

  try {

    await saveScanSubnet(subnet);

    window.homebridge?.toast?.success(
      `Saved. Devices will be scanned on ${subnet}.0/24.`,
      'Scan subnet',
    );

  } catch (error) {

    console.error(error);

    window.homebridge?.toast?.error(
      error instanceof Error ? error.message : String(error),
      'Failed to save scan subnet',
    );

  } finally {
    saveButton.disabled = false;
    saveButton.textContent = 'Save';
  }
}

export function initialize(): void {

  const button = document.getElementById('scanButton') as HTMLButtonElement;
  const results = document.getElementById('results') as HTMLDivElement;
  const subnetInput = document.getElementById('scanSubnetInput') as HTMLInputElement;
  const saveSubnetButton = document.getElementById('saveSubnetButton') as HTMLButtonElement;

  loadScanSubnet(subnetInput);

  saveSubnetButton.addEventListener('click', () => {
    handleSaveSubnet(subnetInput, saveSubnetButton);
  });

  subnetInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      handleSaveSubnet(subnetInput, saveSubnetButton);
    }
  });

  results.addEventListener('change', (event) => {

    const target = event.target as HTMLElement;

    if (target.id === 'selectAllCheckbox') {

      const checked = (target as HTMLInputElement).checked;

      importCheckboxes(results).forEach(checkbox => {
        checkbox.checked = checked;
      });

      updateControls(results);
      return;
    }

    if (target.classList.contains('importCheckbox')) {
      updateControls(results);
    }
  });

  results.addEventListener('click', (event) => {

    const target = event.target as HTMLElement;

    if (target.id === 'applyChangesButton') {
      handleApplyClick(results);
      return;
    }

    if (target.classList.contains('removeToggle')) {
      toggleRemoveMark(target as HTMLButtonElement, results);
    }
  });

  button.addEventListener('click', async () => {

    results.replaceChildren();
    results.innerHTML = '<p class="empty">Scanning...</p>';

    try {

      const devices = await request<UiDevice[]>('/scan');

      if (devices.length === 0) {
        results.innerHTML = '<p class="empty">No Tasmota devices found.</p>';
        return;
      }

      const unconfiguredCount =
        devices.filter(device => !device.configured).length;

      const sorted = [...devices].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      );

      const list = document.createElement('div');
      list.className = 'device-list';
      sorted.forEach(device => list.appendChild(deviceRow(device)));

      results.replaceChildren(
        buildControls(unconfiguredCount),
        list,
        buildApplyBar(),
      );

    } catch (error) {

      console.error(error);

      const message = error instanceof Error ? error.message : String(error);
      const errorText = document.createElement('p');
      errorText.className = 'empty';
      errorText.textContent = `Scan failed: ${message}`;

      results.replaceChildren(errorText);
    }
  });
}
